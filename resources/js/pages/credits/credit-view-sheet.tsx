import {
    CheckCircle2,
    CreditCard,
    ExternalLink,
    FileImage,
    FileText,
    Landmark,
    Microscope,
    Receipt,
    Wallet,
    XCircle,
} from 'lucide-react';
import HeadingSheet from '@/components/heading-sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface SpecimenItem {
    id: number;
    sequence_code?: string;
    customer_relation?: { name: string };
    type?: { name: string };
    examination?: { name: string };
}

interface CreditInvoiceSpecimen {
    credit_id: number;
    invoice_id: number;
    specimen_id: number;
    is_paid: boolean;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    specimen?: SpecimenItem;
}

interface InvoiceModel {
    id: number;
    full_invoice_number: string;
    payment_type: string;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    total_paid: string | number;
    invoice_file?: string;
    proof_of_payment?: string;
    invoice_type?: string | null;
    created_at: string;
    payment_method_date?: string | null;
    cash_value?: string | number | null;
    check_number?: string | null;
    check_value?: string | number | null;
    card_last_4?: string | null;
    card_value_charged?: string | number | null;
    card_expiration?: string | null;
    card_authorization_code?: string | null;
    transfer_bank_id?: number | null;
    transfer_value?: string | number | null;
    transfer_authorization_code?: string | null;
    transfer_bank?: { id: number; name: string } | null;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    created_at: string;
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    invoices?: InvoiceModel[];
    group?: any;
    credit_invoice_specimens?: CreditInvoiceSpecimen[];
}

interface Props {
    credit: Credit | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

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

const getPaymentIcon = (type: string) => {
    switch (type) {
        case 'cash':
            return <Wallet className="h-3.5 w-3.5 text-emerald-500" />;
        case 'credit card':
        case 'card':
            return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
        case 'bank transfer':
        case 'transfer':
            return <Landmark className="h-3.5 w-3.5 text-purple-500" />;
        case 'check':
            return <Receipt className="h-3.5 w-3.5 text-amber-500" />;
        default:
            return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
    }
};

const getPaymentBadgeClass = (type: string) => {
    switch (type) {
        case 'cash':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
        case 'credit card':
        case 'card':
            return 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400';
        case 'bank transfer':
        case 'transfer':
            return 'border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400';
        case 'check':
            return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
        case 'credit':
            return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400';
        default:
            return 'border-border bg-muted text-muted-foreground';
    }
};

const isImageFile = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();

    return ext ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) : false;
};

function InvoiceCard({
    invoice,
    label,
    index,
}: {
    invoice: InvoiceModel;
    label: string;
    index?: number;
}) {
    return (
        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {label}
                    {index !== undefined && index > 0 ? ` #${index}` : ''}
                </span>
                <Badge
                    variant="outline"
                    className={`flex items-center gap-1 rounded-full text-[10px] font-bold capitalize ${getPaymentBadgeClass(invoice.payment_type)}`}
                >
                    {getPaymentIcon(invoice.payment_type)}
                    {getPaymentTypeLabel(invoice.payment_type)}
                </Badge>
            </div>

            <div className="font-mono text-sm font-bold text-foreground">
                {invoice.full_invoice_number}
            </div>

            <Separator />

            {/* Amounts */}
            <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Importe Neto:</span>
                    <span>
                        L. {parseFloat(String(invoice.amount)).toFixed(2)}
                    </span>
                </div>
                {parseFloat(String(invoice.discount)) > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Descuentos:</span>
                        <span>
                            - L.{' '}
                            {parseFloat(String(invoice.discount)).toFixed(2)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>
                        L. {parseFloat(String(invoice.subtotal)).toFixed(2)}
                    </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Total Factura:</span>
                    <span>
                        L. {parseFloat(String(invoice.total)).toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Total Pagado:</span>
                    <span>
                        L.{' '}
                        {parseFloat(String(invoice.total_paid || 0)).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Payment method details */}
            {invoice.payment_method_date && (
                <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                        Fecha de pago:
                    </span>{' '}
                    {invoice.payment_method_date}
                </div>
            )}
            {invoice.payment_type === 'cash' && invoice.cash_value && (
                <div className="rounded-md bg-muted/40 p-2.5 text-[11px]">
                    <span className="font-semibold">Efectivo recibido:</span> L.{' '}
                    {parseFloat(String(invoice.cash_value)).toFixed(2)}
                </div>
            )}
            {invoice.payment_type === 'check' && (
                <div className="space-y-1 rounded-md bg-muted/40 p-2.5 text-[11px]">
                    {invoice.check_number && (
                        <div>
                            <span className="font-semibold">N° Cheque:</span>{' '}
                            {invoice.check_number}
                        </div>
                    )}
                    {invoice.check_value && (
                        <div>
                            <span className="font-semibold">
                                Valor del cheque:
                            </span>{' '}
                            L.{' '}
                            {parseFloat(String(invoice.check_value)).toFixed(2)}
                        </div>
                    )}
                </div>
            )}
            {invoice.payment_type === 'credit card' && (
                <div className="space-y-1 rounded-md bg-muted/40 p-2.5 text-[11px]">
                    {invoice.card_last_4 && (
                        <div>
                            <span className="font-semibold">Tarjeta:</span> ****{' '}
                            {invoice.card_last_4}
                        </div>
                    )}
                    {invoice.card_expiration && (
                        <div>
                            <span className="font-semibold">Vence:</span>{' '}
                            {invoice.card_expiration}
                        </div>
                    )}
                    {invoice.card_authorization_code && (
                        <div>
                            <span className="font-semibold">Autorización:</span>{' '}
                            {invoice.card_authorization_code}
                        </div>
                    )}
                    {invoice.card_value_charged && (
                        <div>
                            <span className="font-semibold">
                                Monto cargado:
                            </span>{' '}
                            L.{' '}
                            {parseFloat(
                                String(invoice.card_value_charged),
                            ).toFixed(2)}
                        </div>
                    )}
                </div>
            )}
            {invoice.payment_type === 'bank transfer' && (
                <div className="space-y-1 rounded-md bg-muted/40 p-2.5 text-[11px]">
                    {invoice.transfer_bank && (
                        <div>
                            <span className="font-semibold">Banco:</span>{' '}
                            {invoice.transfer_bank.name}
                        </div>
                    )}
                    {invoice.transfer_authorization_code && (
                        <div>
                            <span className="font-semibold">Referencia:</span>{' '}
                            {invoice.transfer_authorization_code}
                        </div>
                    )}
                    {invoice.transfer_value && (
                        <div>
                            <span className="font-semibold">
                                Monto transferido:
                            </span>{' '}
                            L.{' '}
                            {parseFloat(String(invoice.transfer_value)).toFixed(
                                2,
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Links */}
            <div className="flex flex-col gap-2 pt-1">
                {invoice.invoice_file && (
                    <a
                        href={`/storage/${invoice.invoice_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Ver Factura PDF
                    </a>
                )}
                {invoice.proof_of_payment && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                            <div className="flex min-w-0 items-center gap-2">
                                {isImageFile(invoice.proof_of_payment) ? (
                                    <FileImage className="h-4 w-4 shrink-0 text-blue-500" />
                                ) : (
                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                )}
                                <span className="max-w-[140px] truncate font-medium">
                                    {invoice.proof_of_payment.split('/').pop()}
                                </span>
                            </div>
                            <a
                                href={`/storage/${invoice.proof_of_payment}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
                            >
                                <ExternalLink className="h-3 w-3" /> Ver
                            </a>
                        </div>
                        {isImageFile(invoice.proof_of_payment) && (
                            <div className="flex max-h-[140px] items-center justify-center overflow-hidden rounded-md border bg-muted/10">
                                <img
                                    src={`/storage/${invoice.proof_of_payment}`}
                                    alt="Comprobante"
                                    className="max-h-[140px] max-w-full object-contain"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CreditViewSheet({ credit, open, onOpenChange }: Props) {
    if (!credit) {
        return null;
    }

    const remainingVal = parseFloat(String(credit.amount_remaining));
    const amountPaid = parseFloat(String(credit.amount_paid));
    const creditAmount = parseFloat(String(credit.credit_amount));
    const isPaid = remainingVal === 0;
    const isPartial = amountPaid > 0 && remainingVal > 0;

    const originalInvoice = credit.invoices?.find(
        (inv) => inv.payment_type === 'credit',
    );
    const paymentInvoices =
        credit.invoices?.filter((inv) => inv.payment_type !== 'credit') || [];

    const creditSpecimens = credit.credit_invoice_specimens || [];
    const paidCount = creditSpecimens.filter((s) => s.is_paid).length;
    const pendingCount = creditSpecimens.filter((s) => !s.is_paid).length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="z-[100] w-full overflow-y-auto sm:max-w-[90vw] md:max-w-[1000px] lg:max-w-[1100px]">
                <div className="flex h-full flex-col gap-6 pb-8">
                    {/* Header */}
                    <div className="flex items-start gap-3 border-b pr-12 pb-4">
                        <div className="flex-1">
                            <HeadingSheet
                                title={`Crédito #${credit.id} — ${credit.customer?.name || 'N/A'}`}
                                description={`Detalle completo del crédito, muestras asociadas y registro de pagos.`}
                            />
                        </div>
                        <div className="mt-1 shrink-0">
                            {isPaid ? (
                                <Badge
                                    variant="outline"
                                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Pagado
                                </Badge>
                            ) : isPartial ? (
                                <Badge
                                    variant="outline"
                                    className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                >
                                    Pago Parcial
                                </Badge>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className="border-destructive/20 bg-destructive/10 text-destructive"
                                >
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Pendiente
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 gap-6 px-5 lg:grid-cols-3">
                        {/* Left: Specimens + Credit summary */}
                        <div className="space-y-6 lg:col-span-2">
                            {/* Credit Summary */}
                            <div className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
                                <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                    Resumen del Crédito
                                </h3>
                                <Separator />
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            Cliente
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {credit.customer?.name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            ID / RTN
                                        </span>
                                        <span className="font-mono font-semibold text-foreground">
                                            {credit.customer?.id_number}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            Tipo
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {credit.is_group
                                                ? 'Grupo de Muestras'
                                                : 'Muestra Individual'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            Monto Total
                                        </span>
                                        <span className="font-mono font-semibold text-foreground">
                                            L. {creditAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            Monto Pagado
                                        </span>
                                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                            L. {amountPaid.toFixed(2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                            Saldo Pendiente
                                        </span>
                                        <span
                                            className={`font-mono font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
                                        >
                                            L. {remainingVal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                        <span>Progreso de Pago</span>
                                        <span className="font-semibold">
                                            {creditAmount > 0
                                                ? (
                                                      (amountPaid /
                                                          creditAmount) *
                                                      100
                                                  ).toFixed(1)
                                                : 0}
                                            %
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                            style={{
                                                width: `${creditAmount > 0 ? Math.min(100, (amountPaid / creditAmount) * 100) : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Specimens (group credit) */}
                            {credit.is_group && creditSpecimens.length > 0 && (
                                <div className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                                            <Microscope className="h-5 w-5" />
                                            Muestras del Grupo (
                                            {creditSpecimens.length})
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {paidCount} pagadas
                                            </span>
                                            {pendingCount > 0 && (
                                                <span className="flex items-center gap-1 font-semibold text-destructive">
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    {pendingCount} pendientes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-3">
                                        {creditSpecimens.map((item) => {
                                            const spec = item.specimen;
                                            const isPaidSpec = item.is_paid;

                                            return (
                                                <div
                                                    key={item.specimen_id}
                                                    className={`flex items-start justify-between rounded-lg border p-3.5 transition-colors ${
                                                        isPaidSpec
                                                            ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                                                            : 'border-border bg-muted/20 hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            {spec?.sequence_code && (
                                                                <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                                                                    {
                                                                        spec.sequence_code
                                                                    }
                                                                </span>
                                                            )}
                                                            {isPaidSpec ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-emerald-500/20 bg-emerald-500/10 px-2 py-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                                                                >
                                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                    Pagado
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-amber-500/20 bg-amber-500/10 px-2 py-0 text-[10px] font-bold text-amber-700 dark:text-amber-400"
                                                                >
                                                                    Pendiente
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            <span className="font-semibold text-foreground">
                                                                Paciente:
                                                            </span>{' '}
                                                            {spec
                                                                ?.customer_relation
                                                                ?.name || 'N/A'}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {spec?.type?.name ||
                                                                'N/A'}
                                                            {spec?.examination
                                                                ?.name &&
                                                                ` — ${spec.examination.name}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-foreground">
                                                            L.{' '}
                                                            {parseFloat(
                                                                String(
                                                                    item.total,
                                                                ),
                                                            ).toFixed(2)}
                                                        </div>
                                                        {parseFloat(
                                                            String(
                                                                item.discount,
                                                            ),
                                                        ) > 0 && (
                                                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                                                - L.{' '}
                                                                {parseFloat(
                                                                    String(
                                                                        item.discount,
                                                                    ),
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
                                                                desc.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Invoices */}
                        <div className="space-y-5">
                            {/* Original invoice */}
                            {originalInvoice && (
                                <InvoiceCard
                                    invoice={originalInvoice}
                                    label="Factura Original (Crédito)"
                                />
                            )}

                            {/* Payment invoices */}
                            {paymentInvoices.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        Pagos Registrados (
                                        {paymentInvoices.length})
                                    </h3>
                                    {paymentInvoices.map((inv, idx) => (
                                        <InvoiceCard
                                            key={inv.id}
                                            invoice={inv}
                                            label="Pago"
                                            index={idx + 1}
                                        />
                                    ))}
                                </div>
                            )}

                            {paymentInvoices.length === 0 &&
                                !originalInvoice && (
                                    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground italic">
                                        No hay facturas asociadas a este
                                        crédito.
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
