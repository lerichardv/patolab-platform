import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    History,
    User,
    Calendar,
    ArrowRight,
    RotateCcw,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import HeadingSheet from '@/components/heading-sheet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface Props {
    invoice: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const IGNORED_COLUMNS = new Set([
    'id',
    'full_invoice_number',
    'invoice_number',
    'cai_range_id',
    'customer_id',
    'specimen_id',
    'rental_id',
    'payment_type',
    'payment_method_date',
    'invoice_id',
    'examination_id',
    'is_group',
    'group_id',
    'credit_id',
    'is_paid',
    'created_at',
    'updated_at',
    'deleted_at',
]);

const COLUMN_LABELS: Record<string, string> = {
    amount: 'Precio Unitario',
    discount: 'Descuento',
    subtotal: 'Subtotal',
    exempt_amount: 'Monto Exento',
    tax_exempt_amount: 'Monto Exonerado',
    taxable_amount_15: 'Monto Gravado 15%',
    taxable_amount_18: 'Monto Gravado 18%',
    isv_15: 'ISV 15%',
    isv_18: 'ISV 18%',
    total: 'Total',
    quantity: 'Cantidad',
    quantity_paid: 'Cantidad Pagada',
    selected_price: 'Precio Seleccionado',
    custom_specimen_price: 'Precio Personalizado',
};

export default function InvoiceAuditSheet({
    invoice,
    open,
    onOpenChange,
}: Props) {
    const { auth } = usePage<any>().props;

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [restoring, setRestoring] = useState(false);

    const [changeToRestore, setChangeToRestore] = useState<{
        invoice_specimen_id: number;
        column: string;
        value: any;
        columnName: string;
        currentValueStr: string;
        newValueStr: string;
    } | null>(null);

    const fetchHistory = () => {
        if (!invoice) {
            return;
        }

        setLoading(true);
        axios
            .get(`/invoices/${invoice.id}/audit-history`)
            .then((res) => {
                setHistory(res.data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Error al cargar el historial de cambios');
                setLoading(false);
            });
    };

    useEffect(() => {
        if (open && invoice) {
            fetchHistory();
        }
    }, [open, invoice]);

    const handleRestore = () => {
        if (!changeToRestore || !invoice) {
            return;
        }

        setRestoring(true);

        axios
            .post(`/invoices/${invoice.id}/restore-audit-change`, {
                invoice_specimen_id: changeToRestore.invoice_specimen_id,
                column: changeToRestore.column,
                value: changeToRestore.value,
            })
            .then(() => {
                toast.success(
                    `Columna '${changeToRestore.columnName}' restaurada con éxito`,
                );
                setChangeToRestore(null);
                fetchHistory();
                router.reload();
            })
            .catch((err) => {
                toast.error(
                    err.response?.data?.message ||
                        'Error al restaurar el cambio',
                );
            })
            .finally(() => {
                setRestoring(false);
            });
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const filteredHistory = history
        .map((session) => ({
            ...session,
            changes_made: session.changes_made.filter(
                (change: any) => !IGNORED_COLUMNS.has(change.column),
            ),
        }))
        .filter((session) => session.changes_made.length > 0);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-[80vw] md:max-w-[750px] lg:max-w-[900px]">
                    <HeadingSheet
                        title="Historial de Cambios"
                        description={`Verifique las modificaciones realizadas en el desglose de muestras de la factura ${invoice?.full_invoice_number || ''}.`}
                    />

                    {loading ? (
                        <div className="flex h-[350px] flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="animate-pulse text-sm font-medium text-muted-foreground">
                                Cargando historial de auditoría...
                            </span>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="mt-6 flex h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 p-6 text-center">
                            <div className="rounded-full bg-secondary p-4 text-secondary-foreground">
                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="max-w-[360px] space-y-1">
                                <h3 className="font-semibold text-foreground">
                                    Sin cambios registrados
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    No se han detectado modificaciones auditadas
                                    en las muestras de esta factura.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4 px-5 pb-12">
                            {filteredHistory.map((session, index) => (
                                <div
                                    key={`${session.audit_session_code}_${session.invoice_specimen_id}_${index}`}
                                    className="group rounded-lg border bg-card p-3.5 shadow-2xs transition-all duration-150 hover:border-primary/30"
                                >
                                    {/* Session Header */}
                                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                <User className="h-3.5 w-3.5 text-primary/70" />
                                                <span>{session.user_name}</span>
                                            </div>
                                            <span className="text-muted-foreground/30">
                                                •
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {formatDate(session.date)}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground/30">
                                                •
                                            </span>
                                            <div className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                                                <span>
                                                    Sesión:{' '}
                                                    {session.audit_session_code.substring(
                                                        0,
                                                        8,
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {session.specimen_sequence_code && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-5 border-primary/20 bg-primary/5 px-2 font-mono text-[11px] text-primary"
                                                >
                                                    {
                                                        session.specimen_sequence_code
                                                    }
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="secondary"
                                                className={`h-5 px-2 text-[10px] font-bold tracking-wider capitalize ${
                                                    session.action === 'create'
                                                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                }`}
                                            >
                                                {session.action === 'create'
                                                    ? 'Creación'
                                                    : 'Actualización'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Changes Compact List */}
                                    <div className="divide-y divide-border/30">
                                        {session.changes_made.map(
                                            (change: any, cIdx: number) => {
                                                const columnName =
                                                    COLUMN_LABELS[
                                                        change.column
                                                    ] || change.column;

                                                const isNullOldValue =
                                                    change.old === null ||
                                                    change.old === '' ||
                                                    String(
                                                        change.old,
                                                    ).toUpperCase() === 'NULL';

                                                const isNullNewValue =
                                                    change.new === null ||
                                                    change.new === '' ||
                                                    String(
                                                        change.new,
                                                    ).toUpperCase() === 'NULL';

                                                const isNullCurrentValue =
                                                    change.current === null ||
                                                    change.current ===
                                                        undefined ||
                                                    change.current === '' ||
                                                    String(
                                                        change.current,
                                                    ).toUpperCase() === 'NULL';

                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/30"
                                                    >
                                                        {/* Left: Column Label */}
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-sm font-medium text-foreground/90">
                                                                {columnName}
                                                            </span>
                                                        </div>

                                                        {/* Right: Restore button & Change diff */}
                                                        <div className="flex shrink-0 items-center gap-3">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={
                                                                    isNullOldValue
                                                                }
                                                                className="mt-3.5 h-6 gap-1 px-2 text-[11px] font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                                                                onClick={() =>
                                                                    setChangeToRestore(
                                                                        {
                                                                            invoice_specimen_id:
                                                                                session.invoice_specimen_id,
                                                                            column: change.column,
                                                                            value: change.old,
                                                                            columnName:
                                                                                columnName,
                                                                            currentValueStr:
                                                                                change.current !==
                                                                                    null &&
                                                                                change.current !==
                                                                                    undefined &&
                                                                                change.current !==
                                                                                    ''
                                                                                    ? String(
                                                                                          change.current,
                                                                                      )
                                                                                    : isNullNewValue
                                                                                      ? 'NULL'
                                                                                      : String(
                                                                                            change.new,
                                                                                        ),
                                                                            newValueStr:
                                                                                change.old !==
                                                                                    null &&
                                                                                change.old !==
                                                                                    ''
                                                                                    ? String(
                                                                                          change.old,
                                                                                      )
                                                                                    : 'NULL',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <RotateCcw className="h-3 w-3 text-primary/80" />
                                                                <span>
                                                                    Restaurar
                                                                    valor
                                                                    anterior
                                                                </span>
                                                            </Button>

                                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                                {/* Old Value */}
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="font-sans text-[9px] font-medium tracking-wider text-muted-foreground/70 uppercase">
                                                                        Anterior
                                                                    </span>
                                                                    {isNullOldValue ? (
                                                                        <span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                            NULL
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                                            {
                                                                                change.old
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <ArrowRight className="mt-3.5 h-3 w-3 shrink-0 text-muted-foreground/50" />

                                                                {/* New Value */}
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="font-sans text-[9px] font-medium tracking-wider text-muted-foreground/70 uppercase">
                                                                        Nuevo
                                                                    </span>
                                                                    {isNullNewValue ? (
                                                                        <span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                            NULL
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                                            {
                                                                                change.new
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <span className="mt-3.5 text-muted-foreground/30">
                                                                    •
                                                                </span>

                                                                {/* Valor Actual en InvoiceSpecimen */}
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="font-sans text-[9px] font-medium tracking-wider text-muted-foreground/70 uppercase">
                                                                        Actual
                                                                    </span>
                                                                    {isNullCurrentValue ? (
                                                                        <span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                            NULL
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                                                            {
                                                                                change.current
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={changeToRestore !== null}
                onOpenChange={(open) => !open && setChangeToRestore(null)}
            >
                <AlertDialogContent className="max-w-[450px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                            <RotateCcw className="h-5 w-5 text-primary" />
                            <span>Confirmar Restauración</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 pt-2">
                            <p>
                                ¿Está seguro de restaurar el campo{' '}
                                <strong>"{changeToRestore?.columnName}"</strong>{' '}
                                a su valor original?
                            </p>
                            <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                                <div className="flex items-center justify-between gap-2">
                                    {/* Left: Valor Actual */}
                                    <div className="flex min-w-0 flex-col items-center gap-2">
                                        <span className="font-sans text-[10px] font-medium text-muted-foreground uppercase">
                                            Valor Actual
                                        </span>
                                        <div>
                                            <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                                {
                                                    changeToRestore?.currentValueStr
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <ArrowRight className="mt-4 h-4 w-4 shrink-0 text-muted-foreground/80" />

                                    {/* Right: Valor a Aplicar */}
                                    <div className="flex min-w-0 flex-col items-center gap-2">
                                        <span className="font-sans text-[10px] font-medium text-muted-foreground uppercase">
                                            Valor a Aplicar
                                        </span>
                                        <div>
                                            <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-lg font-semibold text-amber-600 dark:text-amber-400">
                                                {changeToRestore?.newValueStr}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">
                                Esta acción guardará el cambio en el desglose de
                                muestras y registrará una nueva auditoría con
                                origen "changes history".
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={restoring}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleRestore();
                            }}
                            disabled={restoring}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {restoring ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Restaurando...
                                </>
                            ) : (
                                'Sí, restaurar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
