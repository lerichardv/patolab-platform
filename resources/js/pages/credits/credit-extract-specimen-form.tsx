import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Check,
    FileCheck,
    FileText,
    Info,
    Layers,
    ShieldCheck,
    User,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { extractSpecimens as extractCreditSpecimens } from '@/actions/App/Http/Controllers/CreditController';
import InputError from '@/components/input-error';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface CreditInvoiceSpecimen {
    id: number;
    credit_id: number;
    invoice_id: number;
    specimen_id: number;
    is_paid: boolean;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    quantity: number;
    quantity_paid?: number;
    specimen?: {
        id: number;
        sequence_code: string;
        customer_relation?: {
            name: string;
        };
        type?: {
            name: string;
        };
        examination?: {
            name: string;
        };
    };
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    is_group?: boolean;
    group_id?: number | null;
    customer?: Customer;
    last_payment_date?: string | null;
    reminder_interval_in_seconds?: number;
    credit_invoice_specimens?: CreditInvoiceSpecimen[];
    group?: {
        id: number;
        name: string;
        specimens?: any[];
    };
}

interface Props {
    credit: Credit;
    onSuccess: () => void;
}

export default function CreditExtractSpecimenForm({
    credit,
    onSuccess,
}: Props) {
    const totalCreditVal = parseFloat(String(credit.credit_amount || '0'));
    const amountPaidVal = parseFloat(String(credit.amount_paid || '0'));
    const remainingVal = parseFloat(String(credit.amount_remaining || '0'));

    const specimensList = useMemo(() => {
        return credit.credit_invoice_specimens || [];
    }, [credit.credit_invoice_specimens]);

    const unpaidSpecimens = useMemo(() => {
        return specimensList.filter((item) => !item.is_paid);
    }, [specimensList]);

    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        specimen_ids: [] as number[],
        is_social_security: false,
    });

    const handleSpecimenToggle = (specimenId: number) => {
        const item = specimensList.find((x) => x.specimen_id === specimenId);

        if (!item || item.is_paid) {
            return;
        }

        const isSelected = data.specimen_ids.includes(specimenId);
        let nextIds: number[];

        if (isSelected) {
            nextIds = data.specimen_ids.filter((id) => id !== specimenId);
        } else {
            nextIds = [...data.specimen_ids, specimenId];
        }

        setData('specimen_ids', nextIds);
    };

    const handleSelectAllUnpaid = () => {
        // If selecting all would select every specimen in the group,
        // leave the last one to enforce the invariant (at least 1 must remain)
        if (
            unpaidSpecimens.length === specimensList.length &&
            specimensList.length > 1
        ) {
            const allExceptLast = unpaidSpecimens
                .slice(0, unpaidSpecimens.length - 1)
                .map((x) => x.specimen_id);
            setData('specimen_ids', allExceptLast);
            toast.info(
                'Se seleccionaron todas excepto una para mantener el grupo original.',
            );
        } else {
            setData(
                'specimen_ids',
                unpaidSpecimens.map((x) => x.specimen_id),
            );
        }
    };

    const handleSelectNone = () => {
        setData('specimen_ids', []);
    };

    // Calculate extracted values
    const selectedCalculations = useMemo(() => {
        const selectedItems = specimensList.filter((item) =>
            data.specimen_ids.includes(item.specimen_id),
        );

        const extractedTotal = selectedItems.reduce((acc, item) => {
            const unitPrice = parseFloat(String(item.amount || '0'));
            const unitDiscount = parseFloat(String(item.discount || '0'));
            const qty = item.quantity || 1;
            const itemTotal =
                item.total !== undefined && item.total !== null
                    ? parseFloat(String(item.total))
                    : (unitPrice - unitDiscount) * qty;

            return acc + itemTotal;
        }, 0);

        const extractedCount = selectedItems.length;
        const remainingCount = specimensList.length - extractedCount;
        const newOriginalTotal = Math.max(0, totalCreditVal - extractedTotal);
        const newOriginalRemaining = Math.max(
            0,
            newOriginalTotal - amountPaidVal,
        );

        return {
            selectedItems,
            extractedCount,
            extractedTotal,
            remainingCount,
            newOriginalTotal,
            newOriginalRemaining,
        };
    }, [specimensList, data.specimen_ids, totalCreditVal, amountPaidVal]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (data.specimen_ids.length === 0) {
            toast.error('Debe seleccionar al menos una muestra para extraer.');

            return;
        }

        if (data.specimen_ids.length >= specimensList.length) {
            toast.error(
                'No se pueden extraer todas las muestras. Debe quedar al menos una muestra en el grupo original.',
            );

            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        post(extractCreditSpecimens(credit.id).url, {
            onSuccess: () => {
                toast.success('Muestra(s) extraída(s) del grupo con éxito.');
                onSuccess();
                reset();
            },
            onError: () => {
                toast.error(
                    'Ocurrió un error al extraer las muestras del crédito.',
                );
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-5 px-5 py-4">
            {/* Credit details header */}
            <div>
                <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Detalles del Crédito Grupal
                </h3>
                <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-semibold text-foreground">
                            {credit.customer?.name}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ID / RTN:</span>
                        <span className="font-semibold text-foreground">
                            {credit.customer?.id_number}
                        </span>
                    </div>
                    {credit.group?.name && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Grupo:
                            </span>
                            <span className="font-semibold text-foreground">
                                {credit.group.name}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">
                            Monto Total de Crédito:
                        </span>
                        <span className="font-semibold text-foreground">
                            L. {totalCreditVal.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Monto Pagado:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            L. {amountPaidVal.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 text-base font-bold">
                        <span className="text-primary">Saldo Pendiente:</span>
                        <span className="text-destructive">
                            L. {remainingVal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Specimen selection list */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Seleccionar Muestras a Extraer (
                        {data.specimen_ids.length} de {specimensList.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleSelectAllUnpaid}
                            className="h-auto p-0 text-xs font-semibold text-primary hover:no-underline"
                        >
                            Seleccionar pendientes
                        </Button>
                        <span className="text-xs text-muted-foreground/50">
                            |
                        </span>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleSelectNone}
                            className="h-auto p-0 text-xs font-semibold text-muted-foreground hover:text-foreground hover:no-underline"
                        >
                            Ninguna
                        </Button>
                    </div>
                </div>

                <div className="max-h-[290px] space-y-2.5 overflow-y-auto rounded-xl border bg-card p-3 shadow-inner">
                    {specimensList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No se encontraron muestras en este crédito grupal.
                        </div>
                    ) : (
                        specimensList.map((item) => {
                            const spec = item.specimen;
                            const isPaid = item.is_paid;
                            const isChecked = data.specimen_ids.includes(
                                item.specimen_id,
                            );
                            const unitPrice = parseFloat(
                                String(item.amount || '0'),
                            );
                            const unitDiscount = parseFloat(
                                String(item.discount || '0'),
                            );
                            const qty = item.quantity || 1;
                            const itemTotal =
                                item.total !== undefined && item.total !== null
                                    ? parseFloat(String(item.total))
                                    : (unitPrice - unitDiscount) * qty;

                            return (
                                <div
                                    key={item.specimen_id}
                                    onClick={() =>
                                        !isPaid &&
                                        handleSpecimenToggle(item.specimen_id)
                                    }
                                    className={cn(
                                        'flex items-start justify-between rounded-lg border p-3 transition-all duration-200',
                                        isPaid
                                            ? 'cursor-not-allowed border-emerald-500/10 bg-emerald-500/5 opacity-75 dark:bg-emerald-500/10'
                                            : isChecked
                                              ? 'cursor-pointer border-primary/50 bg-primary/5 shadow-sm'
                                              : 'cursor-pointer border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50',
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div
                                            className="pt-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                id={`extract-spec-${item.specimen_id}`}
                                                checked={isChecked}
                                                disabled={isPaid}
                                                onCheckedChange={() =>
                                                    handleSpecimenToggle(
                                                        item.specimen_id,
                                                    )
                                                }
                                                className="border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                            />
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {spec?.sequence_code || 'N/A'}
                                            </span>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                Paciente:{' '}
                                                {spec?.customer_relation
                                                    ?.name || 'N/A'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/85">
                                                {spec?.type?.name || 'N/A'}
                                                {spec?.examination?.name &&
                                                    ` - ${spec.examination.name}`}
                                            </span>
                                            {isPaid && (
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    Muestra pagada (no puede
                                                    extraerse)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-between gap-2">
                                        <div className="text-right">
                                            <span className="block text-xs font-semibold text-foreground">
                                                L. {itemTotal.toFixed(2)}
                                            </span>
                                            {isPaid ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    Pagado
                                                </span>
                                            ) : isChecked ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
                                                    Para extraer
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                                    En grupo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <InputError message={errors.specimen_ids as any} />
            </div>

            {/* Social Security invoice switch */}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label
                            htmlFor="extract_is_social_security"
                            className="cursor-pointer text-sm font-semibold"
                        >
                            Factura para seguro
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Asigna número de factura fiscal (CAI) a la nueva
                            factura generada para el Seguro, manteniendo el
                            crédito pendiente de cobro.
                        </p>
                    </div>
                    <Switch
                        id="extract_is_social_security"
                        checked={data.is_social_security}
                        onCheckedChange={(checked) =>
                            setData('is_social_security', checked)
                        }
                    />
                </div>
            </div>

            {/* Live separation summary card */}
            {selectedCalculations.extractedCount > 0 && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                        <Info className="h-4 w-4" />
                        <span>Resumen de la Operación</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* New Invoice / Credit details */}
                        <div className="space-y-1.5 rounded-lg border bg-background/80 p-3 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                    Nueva Factura / Crédito:
                                </span>
                                <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                >
                                    {selectedCalculations.extractedCount === 1
                                        ? 'Individual'
                                        : 'Nuevo Grupo'}
                                </Badge>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Muestras:</span>
                                <span className="font-medium text-foreground">
                                    {selectedCalculations.extractedCount}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Monto total:</span>
                                <span className="font-semibold text-foreground">
                                    L.{' '}
                                    {selectedCalculations.extractedTotal.toFixed(
                                        2,
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Modalidad:</span>
                                <span className="font-medium text-foreground">
                                    {data.is_social_security
                                        ? 'Con número fiscal CAI'
                                        : 'Sin número fiscal (Crédito)'}
                                </span>
                            </div>
                        </div>

                        {/* Original Credit details */}
                        <div className="space-y-1.5 rounded-lg border bg-background/80 p-3 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                    Grupo Original:
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                >
                                    Actualización
                                </Badge>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Muestras restantes:</span>
                                <span className="font-medium text-foreground">
                                    {selectedCalculations.remainingCount}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Nuevo monto total:</span>
                                <span className="font-semibold text-foreground">
                                    L.{' '}
                                    {selectedCalculations.newOriginalTotal.toFixed(
                                        2,
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Nuevo saldo pendiente:</span>
                                <span className="font-semibold text-destructive">
                                    L.{' '}
                                    {selectedCalculations.newOriginalRemaining.toFixed(
                                        2,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">
                        * Los archivos PDF de ambas facturas se regenerarán
                        automáticamente al procesar.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end border-t pt-4">
                <Button
                    type="submit"
                    disabled={processing || data.specimen_ids.length === 0}
                    className="w-full sm:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {processing
                        ? 'Procesando...'
                        : `Sacar ${selectedCalculations.extractedCount > 0 ? `${selectedCalculations.extractedCount} Muestra(s)` : 'Muestras'}`}
                </Button>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="max-w-[480px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirmar Separación de Muestra(s)
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Revise la información a continuación antes de
                            proceder con la separación del crédito.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-2.5 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Cliente:
                            </span>
                            <span className="font-semibold text-foreground">
                                {credit.customer?.name}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Muestras a extraer:
                            </span>
                            <span className="font-semibold text-primary">
                                {selectedCalculations.extractedCount} muestra(s)
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Monto a transferir:
                            </span>
                            <span className="font-semibold text-foreground">
                                L.{' '}
                                {selectedCalculations.extractedTotal.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Tipo de destino:
                            </span>
                            <span className="font-semibold text-foreground">
                                {selectedCalculations.extractedCount === 1
                                    ? 'Crédito Individual (Desvinculado)'
                                    : 'Nuevo Grupo con Crédito'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Asignación CAI:
                            </span>
                            <span className="font-semibold text-foreground">
                                {data.is_social_security
                                    ? 'Sí (Factura para Seguro)'
                                    : 'No (Sin número fiscal)'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Muestras en grupo original:
                            </span>
                            <span className="font-semibold text-foreground">
                                {selectedCalculations.remainingCount} muestra(s)
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-base font-bold">
                            <span className="text-primary">
                                Nuevo saldo grupo original:
                            </span>
                            <span className="text-destructive">
                                L.{' '}
                                {selectedCalculations.newOriginalRemaining.toFixed(
                                    2,
                                )}
                            </span>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSubmit}
                            disabled={processing}
                        >
                            {processing && <Spinner className="mr-2" />}
                            {processing
                                ? 'Procesando...'
                                : 'Confirmar y Separar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}
