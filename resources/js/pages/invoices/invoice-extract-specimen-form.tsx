import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { extractSpecimens as extractInvoiceSpecimens } from '@/actions/App/Http/Controllers/InvoiceController';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface InvoiceSpecimenItem {
    id: number;
    invoice_id: number;
    specimen_id: number;
    is_paid?: boolean;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    quantity: number;
    examination_id?: number;
    examination_name?: string;
    examination?: {
        id?: number;
        name: string;
        code?: string;
    };
    specimen?: {
        id: number;
        sequence_code: string;
        customer_relation?: {
            name: string;
        };
        customerRelation?: {
            name: string;
        };
        type?: {
            name: string;
        };
        examination?: {
            id?: number;
            name: string;
            code?: string;
        };
        examinations?: Array<{
            id: number;
            name: string;
            code?: string;
        }>;
        specimen_examinations?: any[];
        specimenExaminations?: any[];
    };
}

function extractSpecimenExaminations(
    spec: any,
    fallbackItems?: any[],
): Array<{ id?: number; name: string; code?: string }> {
    const list: Array<{ id?: number; name: string; code?: string }> = [];
    const seen = new Set<string>();

    const addExam = (name?: string, id?: number, code?: string) => {
        if (name && !seen.has(name.trim().toLowerCase())) {
            seen.add(name.trim().toLowerCase());
            list.push({ id, name: name.trim(), code });
        }
    };

    if (Array.isArray(spec?.examinations) && spec.examinations.length > 0) {
        spec.examinations.forEach((e: any) => {
            addExam(e.name, e.id, e.code);
        });
    }

    if (
        Array.isArray(spec?.specimen_examinations) &&
        spec.specimen_examinations.length > 0
    ) {
        spec.specimen_examinations.forEach((se: any) => {
            const exam = se.examination || se;
            addExam(exam.name, exam.id || se.examination_id, exam.code);
        });
    }

    if (
        Array.isArray(spec?.specimenExaminations) &&
        spec.specimenExaminations.length > 0
    ) {
        spec.specimenExaminations.forEach((se: any) => {
            const exam = se.examination || se;
            addExam(exam.name, exam.id || se.examination_id, exam.code);
        });
    }

    if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
        fallbackItems.forEach((item: any) => {
            if (
                !spec?.id ||
                !item.specimen_id ||
                item.specimen_id === spec.id
            ) {
                const exam = item.examination || item.specimen?.examination;
                const examName =
                    exam?.name || item.examination_name || item.name;
                addExam(
                    examName,
                    item.examination_id || exam?.id,
                    exam?.code || item.code,
                );
            }
        });
    }

    if (list.length === 0 && spec?.examination?.name) {
        addExam(
            spec.examination.name,
            spec.examination.id,
            spec.examination.code,
        );
    }

    return list;
}

interface Invoice {
    id: number;
    full_invoice_number?: string | null;
    invoice_number?: string | number | null;
    customer_id: number;
    customer?: Customer;
    payment_type: string;
    amount: string | number;
    discount: string | number;
    subtotal: string | number;
    total: string | number;
    is_group?: boolean;
    group_id?: number | null;
    invoice_specimens?: InvoiceSpecimenItem[];
    invoiceSpecimens?: InvoiceSpecimenItem[];
    group?: {
        id: number;
        name: string;
        specimens?: any[];
    };
}

interface Props {
    invoice: Invoice;
    onSuccess: () => void;
}

interface GroupedInvoiceSpecimen {
    specimen_id: number;
    specimen?: any;
    amount: number;
    discount: number;
    subtotal: number;
    total: number;
    quantity: number;
    items: InvoiceSpecimenItem[];
    examinations: Array<{ id?: number; name: string; code?: string }>;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta de Crédito/Débito',
    'credit card': 'Tarjeta de Crédito',
    transfer: 'Transferencia Bancaria',
    'bank transfer': 'Transferencia Bancaria',
    check: 'Cheque',
};

export default function InvoiceExtractSpecimenForm({
    invoice,
    onSuccess,
}: Props) {
    const totalInvoiceVal = parseFloat(String(invoice.total || '0'));

    const groupedSpecimensList = useMemo(() => {
        const rawList =
            invoice.invoice_specimens || invoice.invoiceSpecimens || [];

        const groupMap = new Map<number, GroupedInvoiceSpecimen>();

        rawList.forEach((item) => {
            const specId = item.specimen_id;

            if (!specId) {
                return;
            }

            const unitPrice = parseFloat(String(item.amount || '0'));
            const unitDiscount = parseFloat(String(item.discount || '0'));
            const qty = item.quantity || 1;
            const itemTotal =
                item.total !== undefined && item.total !== null
                    ? parseFloat(String(item.total))
                    : (unitPrice - unitDiscount) * qty;

            const itemSubtotal =
                item.subtotal !== undefined && item.subtotal !== null
                    ? parseFloat(String(item.subtotal))
                    : unitPrice * qty;

            const itemDiscount =
                item.discount !== undefined && item.discount !== null
                    ? parseFloat(String(item.discount))
                    : unitDiscount * qty;

            if (!groupMap.has(specId)) {
                groupMap.set(specId, {
                    specimen_id: specId,
                    specimen: item.specimen,
                    amount: unitPrice,
                    discount: itemDiscount,
                    subtotal: itemSubtotal,
                    total: itemTotal,
                    quantity: qty,
                    items: [item],
                    examinations: [],
                });
            } else {
                const existing = groupMap.get(specId)!;
                existing.total += itemTotal;
                existing.subtotal += itemSubtotal;
                existing.discount += itemDiscount;
                existing.amount += unitPrice;
                existing.items.push(item);

                if (!existing.specimen && item.specimen) {
                    existing.specimen = item.specimen;
                }
            }
        });

        if (groupMap.size === 0 && Array.isArray(invoice.group?.specimens)) {
            invoice.group.specimens.forEach((spec: any) => {
                groupMap.set(spec.id, {
                    specimen_id: spec.id,
                    specimen: spec,
                    amount: 0,
                    discount: 0,
                    subtotal: 0,
                    total: 0,
                    quantity: 1,
                    items: [],
                    examinations: [],
                });
            });
        }

        const result: GroupedInvoiceSpecimen[] = [];
        groupMap.forEach((entry) => {
            entry.examinations = extractSpecimenExaminations(
                entry.specimen,
                entry.items,
            );
            result.push(entry);
        });

        return result;
    }, [invoice.invoice_specimens, invoice.invoiceSpecimens, invoice.group]);

    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        specimen_ids: [] as number[],
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
    });

    const handleSpecimenToggle = (specimenId: number) => {
        const item = groupedSpecimensList.find(
            (x) => x.specimen_id === specimenId,
        );

        if (!item) {
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

    const handleSelectAllExceptOne = () => {
        if (groupedSpecimensList.length > 1) {
            const allExceptLast = groupedSpecimensList
                .slice(0, groupedSpecimensList.length - 1)
                .map((x) => x.specimen_id);
            setData('specimen_ids', allExceptLast);
            toast.info(
                'Se seleccionaron todas excepto una para mantener el grupo original.',
            );
        }
    };

    const handleSelectNone = () => {
        setData('specimen_ids', []);
    };

    // Calculate live separation summary values
    const selectedCalculations = useMemo(() => {
        const selectedItems = groupedSpecimensList.filter((item) =>
            data.specimen_ids.includes(item.specimen_id),
        );

        const extractedTotal = selectedItems.reduce((acc, item) => {
            return acc + item.total;
        }, 0);

        const extractedCount = selectedItems.length;
        const remainingCount = groupedSpecimensList.length - extractedCount;
        const newOriginalTotal = Math.max(0, totalInvoiceVal - extractedTotal);

        return {
            selectedItems,
            extractedCount,
            extractedTotal,
            remainingCount,
            newOriginalTotal,
        };
    }, [groupedSpecimensList, data.specimen_ids, totalInvoiceVal]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (data.specimen_ids.length === 0) {
            toast.error('Debe seleccionar al menos una muestra para separar.');

            return;
        }

        if (data.specimen_ids.length >= groupedSpecimensList.length) {
            toast.error(
                'No se pueden separar todas las muestras del grupo. Debe quedar al menos una muestra en la factura original.',
            );

            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        post(extractInvoiceSpecimens(invoice.id).url, {
            onSuccess: () => {
                toast.success('Muestra(s) separada(s) del grupo con éxito.');
                onSuccess();
                reset();
            },
            onError: () => {
                toast.error(
                    'Ocurrió un error al separar las muestras de la factura.',
                );
            },
        });
    };

    const formattedPaymentType =
        PAYMENT_TYPE_LABELS[invoice.payment_type] || invoice.payment_type;

    return (
        <form onSubmit={submit} className="space-y-5 px-5 py-4">
            {/* Invoice details header */}
            <div>
                <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Detalles de la Factura Grupal
                </h3>
                <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-semibold text-foreground">
                            {invoice.customer?.name || 'N/A'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ID / RTN:</span>
                        <span className="font-semibold text-foreground">
                            {invoice.customer?.id_number || 'N/A'}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">
                            Factura Actual:
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                            {invoice.full_invoice_number ||
                                (invoice.invoice_number
                                    ? String(invoice.invoice_number)
                                    : `#${invoice.id}`)}
                        </span>
                    </div>
                    {invoice.group && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Grupo:
                            </span>
                            <span className="font-semibold text-foreground">
                                {invoice.group.name}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">
                            Método de Pago:
                        </span>
                        <span className="font-medium text-foreground capitalize">
                            {formattedPaymentType}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 text-base font-bold">
                        <span className="text-primary">
                            Monto Total Factura:
                        </span>
                        <span className="text-foreground">
                            L. {totalInvoiceVal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Specimen selection */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Seleccionar Muestras a Separar (
                        {data.specimen_ids.length} de{' '}
                        {groupedSpecimensList.length})
                    </span>
                    <div className="flex gap-2 text-xs">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllExceptOne}
                            disabled={groupedSpecimensList.length <= 1}
                            className="h-6 px-2 text-xs font-medium text-primary hover:text-primary/80"
                        >
                            Seleccionar todas (excepto una)
                        </Button>
                        <span className="text-muted-foreground">|</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectNone}
                            disabled={data.specimen_ids.length === 0}
                            className="h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Ninguna
                        </Button>
                    </div>
                </div>

                <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
                    {groupedSpecimensList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No hay muestras disponibles en este grupo.
                        </div>
                    ) : (
                        groupedSpecimensList.map((item) => {
                            const spec = item.specimen;
                            const isChecked = data.specimen_ids.includes(
                                item.specimen_id,
                            );
                            const itemTotal = item.total;

                            return (
                                <div
                                    key={item.specimen_id}
                                    onClick={() =>
                                        handleSpecimenToggle(item.specimen_id)
                                    }
                                    className={cn(
                                        'flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-all duration-200',
                                        isChecked
                                            ? 'border-primary/50 bg-primary/5 shadow-sm'
                                            : 'border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50',
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div
                                            className="pt-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                id={`extract-invoice-spec-${item.specimen_id}`}
                                                checked={isChecked}
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
                                            <span className="text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">
                                                    Paciente:
                                                </span>{' '}
                                                {spec?.customer_relation
                                                    ?.name ||
                                                    spec?.customerRelation
                                                        ?.name ||
                                                    invoice.customer?.name ||
                                                    'N/A'}
                                            </span>
                                            <div className="flex flex-col gap-1 pt-0.5">
                                                <span className="text-[11px] font-semibold text-foreground">
                                                    Tipo:{' '}
                                                    <span className="font-normal text-muted-foreground">
                                                        {spec?.type?.name ||
                                                            'N/A'}
                                                    </span>
                                                </span>
                                                {item.examinations.length >
                                                0 ? (
                                                    <div className="flex flex-col gap-0.5 pl-1">
                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                            {item.examinations
                                                                .length > 1
                                                                ? 'Exámenes:'
                                                                : 'Examen:'}
                                                        </span>
                                                        <div className="flex flex-col gap-0.5">
                                                            {item.examinations.map(
                                                                (exam, idx) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="flex items-center gap-1.5 text-[11px] font-medium text-foreground"
                                                                    >
                                                                        <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
                                                                        <span>
                                                                            {
                                                                                exam.name
                                                                            }
                                                                        </span>
                                                                        {exam.code && (
                                                                            <span className="font-mono text-[9px] text-muted-foreground uppercase">
                                                                                (
                                                                                {
                                                                                    exam.code
                                                                                }

                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Examen: N/A
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-between gap-2">
                                        <div className="text-right">
                                            <span className="block text-xs font-semibold text-foreground">
                                                L. {itemTotal.toFixed(2)}
                                            </span>
                                            {isChecked ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
                                                    Para separar
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

            {/* Invoice date picker */}
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
                <Label
                    htmlFor="extract_invoice_date"
                    className="text-xs font-semibold"
                >
                    Fecha de la Nueva Factura *
                </Label>
                <DatePicker
                    value={data.invoice_date}
                    onChange={(date) => setData('invoice_date', date)}
                />
                <p className="text-[11px] text-muted-foreground">
                    Fecha oficial con la que se emitirá la nueva factura fiscal
                    con número CAI.
                </p>
                <InputError message={errors.invoice_date} />
            </div>

            {/* Live separation summary card */}
            {selectedCalculations.extractedCount > 0 && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                        <Info className="h-4 w-4" />
                        <span>Resumen de la Operación</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* New Invoice details */}
                        <div className="space-y-1.5 rounded-lg border bg-background/80 p-3 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                    Nueva Factura:
                                </span>
                                <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                >
                                    Nuevo Grupo
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
                                <span>Número fiscal:</span>
                                <span className="font-medium text-foreground">
                                    Nuevo correlativo CAI
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Método de pago:</span>
                                <span className="font-medium text-foreground capitalize">
                                    {formattedPaymentType}
                                </span>
                            </div>
                        </div>

                        {/* Original Invoice details */}
                        <div className="space-y-1.5 rounded-lg border bg-background/80 p-3 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                    Factura Original:
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
                                <span>Estado:</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    Pagada
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
                        : `Separar ${selectedCalculations.extractedCount > 0 ? `${selectedCalculations.extractedCount} Muestra(s)` : 'Muestras'}`}
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
                            proceder con la separación de las muestras.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-2.5 py-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Cliente:
                            </span>
                            <span className="font-semibold text-foreground">
                                {invoice.customer?.name}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Muestras a separar:
                            </span>
                            <span className="font-semibold text-primary">
                                {selectedCalculations.extractedCount} muestra(s)
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Monto nueva factura:
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
                                Nuevo Grupo con Factura CAI
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Fecha de Factura:
                            </span>
                            <span className="font-semibold text-foreground">
                                {data.invoice_date}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-medium text-muted-foreground">
                                Muestras en factura original:
                            </span>
                            <span className="font-semibold text-foreground">
                                {selectedCalculations.remainingCount} muestra(s)
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-base font-bold">
                            <span className="text-primary">
                                Nuevo total factura original:
                            </span>
                            <span className="text-foreground">
                                L.{' '}
                                {selectedCalculations.newOriginalTotal.toFixed(
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
