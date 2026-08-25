import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Microscope,
    User,
    FileText,
    Clock,
    CreditCard,
    Download,
    ExternalLink,
    MapPin,
    FileImage,
    Coins,
    Hash,
} from 'lucide-react';
import { useMemo } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Props {
    invoice: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function InvoiceViewSheet({
    invoice,
    open,
    onOpenChange,
}: Props) {
    if (!invoice) {
        return null;
    }

    const specimen = invoice.specimen;
    const credit = invoice.credit_relation;

    const groupedSpecimens = useMemo(() => {
        if (!invoice) {
            return [];
        }

        const rawItems =
            invoice.invoice_specimens ||
            invoice.invoiceSpecimens ||
            invoice.group_specimens ||
            invoice.groupSpecimens ||
            [];

        if (rawItems.length > 0) {
            const groupsMap = new Map<number | string, any>();

            rawItems.forEach((item: any) => {
                const spec = item.specimen;

                if (!spec) {
                    return;
                }

                const specKey =
                    spec.id || item.specimen_id || spec.sequence_code;

                if (!groupsMap.has(specKey)) {
                    groupsMap.set(specKey, {
                        specimen: spec,
                        items: [],
                        totalSubtotal: 0,
                        totalDiscount: 0,
                        totalAmount: 0,
                    });
                }

                const specGroup = groupsMap.get(specKey);
                const qty = item.quantity ?? 1;
                const amount = parseFloat(item.amount || '0');
                const discount = parseFloat(item.discount || '0');
                const subtotal = parseFloat(item.subtotal || '0');

                specGroup.items.push({
                    ...item,
                    qty,
                    amount,
                    discount,
                    subtotal,
                });
                specGroup.totalAmount += amount * qty;
                specGroup.totalDiscount += discount;
                specGroup.totalSubtotal += subtotal;
            });

            return Array.from(groupsMap.values());
        }

        if (invoice.specimen) {
            return [
                {
                    specimen: invoice.specimen,
                    items: [
                        {
                            examination: invoice.specimen.examination,
                            quantity: invoice.quantity ?? 1,
                            amount: parseFloat(invoice.amount || '0'),
                            discount: parseFloat(invoice.discount || '0'),
                            subtotal: parseFloat(invoice.subtotal || '0'),
                        },
                    ],
                    totalSubtotal: parseFloat(invoice.subtotal || '0'),
                    totalDiscount: parseFloat(invoice.discount || '0'),
                    totalAmount: parseFloat(invoice.amount || '0'),
                },
            ];
        }

        return [];
    }, [invoice]);

    const formattedDate = invoice.created_at
        ? format(new Date(invoice.created_at), "dd 'de' MMMM, yyyy - HH:mm", {
              locale: es,
          })
        : 'N/A';

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
            <SheetContent className="w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                <div className="flex h-full flex-col gap-6 pb-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b pr-12 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <HeadingSheet
                                title={
                                    invoice.full_invoice_number
                                        ? `Factura Fiscal ${invoice.full_invoice_number}`
                                        : `Factura de Crédito #${invoice.credit_payment_id || invoice.id}`
                                }
                                description={`Emitida el ${formattedDate}`}
                            />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="mb-5 grid grid-cols-1 gap-6 px-5 pb-5 md:grid-cols-2">
                        {/* Left Column: Invoice Summary & Totals */}
                        <div className="space-y-6">
                            {/* General Billing Info */}
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <CreditCard className="h-5 w-5" /> Detalles
                                    de Facturación
                                </h3>
                                <Separator />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Hash className="h-3.5 w-3.5" />{' '}
                                            Número de Factura
                                        </span>
                                        <p className="text-sm font-semibold">
                                            {invoice.full_invoice_number || '-'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />{' '}
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
                                    <div className="space-y-1 sm:col-span-2">
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />{' '}
                                            Cliente / Paciente
                                        </span>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium">
                                                {invoice.customer?.name ||
                                                    'N/A'}
                                            </p>
                                            {invoice.customer?.id_number && (
                                                <span className="text-xs text-muted-foreground">
                                                    ID/RTN:{' '}
                                                    {invoice.customer.id_number}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CAI Details */}
                            {invoice.cai_range && (
                                <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <FileText className="h-5 w-5" /> Rango
                                        CAI Autorizado
                                    </h3>
                                    <Separator />
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
                                            {invoice.cai_range.full_prefix}
                                            {String(
                                                invoice.cai_range.start_number,
                                            ).padStart(8, '0')}{' '}
                                            al {invoice.cai_range.full_prefix}
                                            {String(
                                                invoice.cai_range.end_number,
                                            ).padStart(8, '0')}
                                        </p>
                                        <p>
                                            <span className="font-medium">
                                                Fecha Límite:
                                            </span>{' '}
                                            {invoice.cai_range.deadline
                                                ? format(
                                                      new Date(
                                                          invoice.cai_range
                                                              .deadline,
                                                      ),
                                                      'dd/MM/yyyy',
                                                  )
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Totals Table */}
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <Coins className="h-5 w-5" /> Importes y
                                    Totales
                                </h3>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Importe
                                        </span>
                                        <span>
                                            L.{' '}
                                            {parseFloat(invoice.amount).toFixed(
                                                2,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
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
                                            {parseFloat(invoice.total).toFixed(
                                                2,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Specimen details & files */}
                        <div className="space-y-6">
                            {/* Related Specimens info */}
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                        <Microscope className="h-5 w-5" />{' '}
                                        {groupedSpecimens.length > 1
                                            ? `Muestras Relacionadas (${groupedSpecimens.length})`
                                            : 'Muestra Relacionada'}
                                    </h3>
                                    {invoice.is_group && (
                                        <Badge
                                            variant="secondary"
                                            className="font-medium"
                                        >
                                            Grupo de Muestras
                                        </Badge>
                                    )}
                                </div>
                                <Separator />

                                {groupedSpecimens.length > 0 ? (
                                    <div className="space-y-4">
                                        {groupedSpecimens.map(
                                            (specGroup: any, idx: number) => {
                                                const spec = specGroup.specimen;
                                                const customerName =
                                                    spec.customer_relation
                                                        ?.name ||
                                                    spec.customerRelation
                                                        ?.name ||
                                                    spec.customer?.name ||
                                                    invoice.customer?.name ||
                                                    'N/A';

                                                return (
                                                    <div
                                                        key={spec.id || idx}
                                                        className="space-y-3 border-b border-gray-200 pb-4 transition-colors"
                                                    >
                                                        {/* Specimen Header */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-primary">
                                                                    #{idx + 1}
                                                                </span>
                                                                {spec.sequence_code && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-blue-500/30 bg-blue-500/10 font-mono text-xs font-bold text-blue-700 dark:text-blue-300"
                                                                    >
                                                                        {
                                                                            spec.sequence_code
                                                                        }
                                                                    </Badge>
                                                                )}
                                                                <span className="text-xs font-semibold text-foreground">
                                                                    {spec.type
                                                                        ?.name ||
                                                                        'Muestra'}
                                                                </span>
                                                            </div>

                                                            {/* Status Badge */}
                                                            {spec.status && (
                                                                <span
                                                                    className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                                                                    style={{
                                                                        backgroundColor:
                                                                            spec.status_color ||
                                                                            '#cbd5e1',
                                                                    }}
                                                                >
                                                                    {spec.status ===
                                                                    'received'
                                                                        ? 'Recibida'
                                                                        : spec.status ===
                                                                            'macroscopic_review'
                                                                          ? 'Rev. Macroscópica'
                                                                          : spec.status ===
                                                                              'processing'
                                                                            ? 'En Proceso'
                                                                            : spec.status ===
                                                                                'microscopic_review'
                                                                              ? 'Rev. Microscópica'
                                                                              : spec.status ===
                                                                                  'finalized'
                                                                                ? 'Finalizada'
                                                                                : spec.status ===
                                                                                    'delivered'
                                                                                  ? 'Entregada'
                                                                                  : spec.status ===
                                                                                      'cancelled'
                                                                                    ? 'Cancelada'
                                                                                    : spec.status}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Patient & Specimen Info */}
                                                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                                            <div>
                                                                <span className="text-muted-foreground">
                                                                    Paciente:{' '}
                                                                </span>
                                                                <strong className="text-foreground">
                                                                    {
                                                                        customerName
                                                                    }
                                                                </strong>
                                                            </div>

                                                            {spec.category
                                                                ?.name && (
                                                                <div>
                                                                    <span className="text-muted-foreground">
                                                                        Categoría:{' '}
                                                                    </span>
                                                                    <span className="font-medium text-foreground">
                                                                        {
                                                                            spec
                                                                                .category
                                                                                .name
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {(spec
                                                                .referrer_relation
                                                                ?.name ||
                                                                spec
                                                                    .referrerRelation
                                                                    ?.name) && (
                                                                <div className="sm:col-span-2">
                                                                    <span className="text-muted-foreground">
                                                                        Médico
                                                                        Referente:{' '}
                                                                    </span>
                                                                    <span className="font-medium text-foreground">
                                                                        {spec
                                                                            .referrer_relation
                                                                            ?.name ||
                                                                            spec
                                                                                .referrerRelation
                                                                                ?.name}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {spec.anatomic_site && (
                                                                <div className="sm:col-span-2">
                                                                    <span className="text-muted-foreground">
                                                                        Sitio
                                                                        Anatómico:{' '}
                                                                    </span>
                                                                    <span className="font-medium text-foreground">
                                                                        {
                                                                            spec.anatomic_site
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Itemized Examinations List for this Specimen */}
                                                        <div className="space-y-1.5 pt-1">
                                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                                Exámenes /
                                                                Análisis:
                                                            </span>
                                                            <div className="space-y-1">
                                                                {specGroup.items.map(
                                                                    (
                                                                        item: any,
                                                                        itemIdx: number,
                                                                    ) => {
                                                                        const examName =
                                                                            item
                                                                                .examination
                                                                                ?.name ||
                                                                            spec
                                                                                .examination
                                                                                ?.name ||
                                                                            'Análisis';

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    item.id ||
                                                                                    itemIdx
                                                                                }
                                                                                className="flex flex-wrap items-center justify-between rounded-md border bg-background p-2 text-xs"
                                                                            >
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium text-foreground">
                                                                                        {
                                                                                            examName
                                                                                        }
                                                                                    </span>
                                                                                    <span className="text-[10px] text-muted-foreground">
                                                                                        Cant:{' '}
                                                                                        {
                                                                                            item.qty
                                                                                        }{' '}
                                                                                        &bull;
                                                                                        Precio
                                                                                        Base:{' '}
                                                                                        L.{' '}
                                                                                        {item.amount.toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center gap-3 text-right">
                                                                                    {item.discount >
                                                                                        0 && (
                                                                                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                                                            Desc:{' '}
                                                                                            -L.{' '}
                                                                                            {item.discount.toFixed(
                                                                                                2,
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="font-semibold text-foreground">
                                                                                        Subtotal:{' '}
                                                                                        L.{' '}
                                                                                        {item.subtotal.toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
                                        <Microscope className="mx-auto h-8 w-8 text-muted-foreground" />
                                        <h3 className="text-sm font-semibold">
                                            Sin muestra relacionada
                                        </h3>
                                    </div>
                                )}
                            </div>

                            {/* Credit Account Status */}
                            {(invoice.payment_type === 'credit' ||
                                invoice.invoice_type === 'credit payment') &&
                                credit && (
                                    <div className="space-y-4 rounded-lg border border-yellow-500/30 bg-card bg-yellow-500/[0.02] p-5 text-card-foreground shadow-sm">
                                        <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                                            <Coins className="h-5 w-5" /> Estado
                                            de Cuenta de Crédito
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

                            {/* Documents Block */}
                            <div className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <FileText className="h-5 w-5" /> Documentos
                                    Asociados
                                </h3>
                                <Separator />
                                <div className="space-y-3">
                                    {invoice.invoice_file ? (
                                        <div className="space-y-2">
                                            <span className="text-xs text-muted-foreground">
                                                Factura Fiscal Generada:
                                            </span>
                                            <div className="flex items-center justify-between rounded bg-muted/40 p-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-red-500" />
                                                    <span
                                                        className="max-w-[200px] truncate text-xs font-medium"
                                                        title={
                                                            invoice.invoice_file
                                                        }
                                                    >
                                                        {invoice.invoice_file
                                                            .split('/')
                                                            .pop()}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <a
                                                        href={`/storage/${invoice.invoice_file}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                        Ver
                                                    </a>
                                                    <a
                                                        href={`/storage/${invoice.invoice_file}`}
                                                        download
                                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />{' '}
                                                        Descargar
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            No se ha generado archivo de factura
                                            física.
                                        </p>
                                    )}

                                    {invoice.proof_of_payment && (
                                        <div className="space-y-2 pt-2">
                                            <span className="text-xs text-muted-foreground">
                                                Comprobante de Pago:
                                            </span>
                                            <div className="flex items-center justify-between rounded bg-muted/40 p-3">
                                                <div className="flex items-center gap-2">
                                                    {isImageFile(
                                                        invoice.proof_of_payment,
                                                    ) ? (
                                                        <FileImage className="h-5 w-5 text-blue-500" />
                                                    ) : (
                                                        <FileText className="h-5 w-5 text-red-500" />
                                                    )}
                                                    <span
                                                        className="max-w-[200px] truncate text-xs font-medium"
                                                        title={
                                                            invoice.proof_of_payment
                                                        }
                                                    >
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
                                                <div className="mt-1 flex max-h-[200px] items-center justify-center overflow-hidden rounded-md border bg-muted/20">
                                                    <img
                                                        src={`/storage/${invoice.proof_of_payment}`}
                                                        alt="Comprobante de Pago"
                                                        className="max-h-[200px] max-w-full object-contain"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
