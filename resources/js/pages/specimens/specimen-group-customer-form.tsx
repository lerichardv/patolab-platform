import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Check,
    Coins,
    Layers,
    Loader2,
    Mail,
    Phone,
    Receipt,
    RefreshCw,
    User,
    Users,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { CustomerOption } from '@/components/async-customer-combobox';
import AsyncCustomerCombobox from '@/components/async-customer-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface GroupInfo {
    id: number;
    name: string;
    customer_id: number;
    customer: {
        id: number;
        name: string;
        id_number?: string | null;
        type?: string | null;
        phone?: string | null;
        email?: string | null;
    } | null;
    specimens_count: number;
    invoice: {
        id: number;
        full_invoice_number: string;
        payment_type: string;
        total: number;
    } | null;
    credit: {
        id: number;
        amount_remaining: number;
        credit_amount: number;
        status: string;
    } | null;
}

interface Props {
    groupId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
    setIsDirty?: (dirty: boolean) => void;
}

export default function SpecimenGroupCustomerForm({
    groupId,
    onSuccess,
    onCancel,
    setIsDirty,
}: Props) {
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerOption | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        fetch(`/specimen-groups/${groupId}/customer-info`, {
            headers: {
                Accept: 'application/json',
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(
                        'Error al cargar la información del grupo.',
                    );
                }

                return res.json();
            })
            .then((data: GroupInfo) => {
                if (!isMounted) {
                    return;
                }

                setGroupInfo(data);

                if (data.customer) {
                    setSelectedCustomer(data.customer);
                    setSelectedCustomerId(String(data.customer.id));
                }

                setIsDirty?.(false);
            })
            .catch((err) => {
                if (!isMounted) {
                    return;
                }

                toast.error(
                    err.message ||
                        'No se pudo cargar la información del grupo de muestras.',
                );
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [groupId, setIsDirty]);

    const isCustomerChanged = useMemo(() => {
        if (!groupInfo || !selectedCustomer) {
            return false;
        }

        return Number(selectedCustomer.id) !== Number(groupInfo.customer_id);
    }, [groupInfo, selectedCustomer]);

    const computedNewGroupName = useMemo(() => {
        if (!groupInfo) {
            return '';
        }

        const count = groupInfo.specimens_count || 0;
        const targetName = selectedCustomer?.name || 'Cliente';
        const suffix = count === 1 ? 'Muestra' : 'Muestras';

        return `${targetName} - ${count} ${suffix}`;
    }, [groupInfo, selectedCustomer]);

    const handleCustomerChange = (
        id: string,
        customer?: CustomerOption | null,
    ) => {
        setSelectedCustomerId(id);
        setSelectedCustomer(customer ?? null);

        const changed =
            Boolean(customer) &&
            groupInfo !== null &&
            Number(customer?.id) !== Number(groupInfo.customer_id);
        setIsDirty?.(changed);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            return;
        }

        setSubmitting(true);

        router.put(
            `/specimen-groups/${groupId}/customer`,
            {
                customer_id: selectedCustomer.id,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSubmitting(false);
                    setIsDirty?.(false);
                    toast.success(
                        'Cliente principal y registros del grupo actualizados con éxito.',
                    );
                    onSuccess?.();
                },
                onError: (errors) => {
                    setSubmitting(false);
                    const message =
                        Object.values(errors)[0] ||
                        'Error al actualizar el cliente del grupo.';
                    toast.error(message);
                },
            },
        );
    };

    if (loading) {
        return (
            <div className="space-y-6 py-6">
                <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">
                        Cargando información del grupo de muestras...
                    </span>
                </div>
            </div>
        );
    }

    if (!groupInfo) {
        return (
            <div className="py-8 text-center text-sm text-destructive">
                No se encontró la información del grupo solicitado.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-4">
            {/* Group Meta Header */}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Grupo de Muestras #{groupInfo.id}
                                </span>
                            </div>
                            <h4 className="font-semibold text-foreground">
                                {groupInfo.name}
                            </h4>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                            variant="secondary"
                            className="gap-1 font-mono text-xs"
                        >
                            <Users className="h-3 w-3" />
                            {groupInfo.specimens_count}{' '}
                            {groupInfo.specimens_count === 1
                                ? 'Muestra'
                                : 'Muestras'}
                        </Badge>
                        {groupInfo.invoice && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-primary/30 bg-primary/5 font-mono text-xs text-primary"
                            >
                                <Receipt className="h-3 w-3" />
                                {groupInfo.invoice.full_invoice_number}
                            </Badge>
                        )}
                        {groupInfo.credit && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/30 bg-amber-500/10 font-mono text-xs text-amber-600 dark:text-amber-400"
                            >
                                <Coins className="h-3 w-3" />
                                Saldo: L.{' '}
                                {Number(
                                    groupInfo.credit.amount_remaining,
                                ).toFixed(2)}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Current Customer Card */}
            <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Cliente Actual del Grupo
                </label>
                <div className="rounded-lg border border-border/80 bg-background p-4 shadow-xs">
                    {groupInfo.customer ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">
                                        {groupInfo.customer.name}
                                    </span>
                                </div>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                        groupInfo.customer.type === 'empresa'
                                            ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                    )}
                                >
                                    {groupInfo.customer.type === 'empresa'
                                        ? 'Empresa'
                                        : 'Individual'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {groupInfo.customer.id_number && (
                                    <span>
                                        <strong className="text-foreground/80">
                                            ID/RTN:
                                        </strong>{' '}
                                        {groupInfo.customer.id_number}
                                    </span>
                                )}
                                {groupInfo.customer.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {groupInfo.customer.phone}
                                    </span>
                                )}
                                {groupInfo.customer.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {groupInfo.customer.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            Sin cliente asignado
                        </span>
                    )}
                </div>
            </div>

            <Separator />

            {/* Customer Selector */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Cliente Principal Seleccionado{' '}
                        <span className="text-destructive">*</span>
                    </label>
                    {isCustomerChanged ? (
                        <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                            Nuevo cliente seleccionado
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="bg-muted/40 text-muted-foreground"
                        >
                            Cliente actual
                        </Badge>
                    )}
                </div>

                <AsyncCustomerCombobox
                    placeholder="Buscar cliente por nombre o RTN..."
                    value={selectedCustomerId}
                    initialCustomer={groupInfo.customer}
                    onChange={handleCustomerChange}
                />

                {/* Selected Customer Card Preview */}
                {selectedCustomer && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-xs">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-foreground">
                                        {selectedCustomer.name}
                                    </span>
                                </div>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                        selectedCustomer.type === 'empresa'
                                            ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                    )}
                                >
                                    {selectedCustomer.type === 'empresa'
                                        ? 'Empresa'
                                        : 'Individual'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {selectedCustomer.id_number && (
                                    <span>
                                        <strong className="text-foreground/80">
                                            ID/RTN:
                                        </strong>{' '}
                                        {selectedCustomer.id_number}
                                    </span>
                                )}
                                {selectedCustomer.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {selectedCustomer.phone}
                                    </span>
                                )}
                                {selectedCustomer.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {selectedCustomer.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Changes Summary / Live Preview */}
            {selectedCustomer && (
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Resumen de Actualización
                        </h5>
                        {!isCustomerChanged && (
                            <span className="text-[11px] text-muted-foreground italic">
                                Sincronización de columnas
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                            <span className="min-w-[130px] font-semibold text-muted-foreground">
                                Nombre del Grupo:
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                {isCustomerChanged ? (
                                    <>
                                        <span className="truncate text-muted-foreground line-through">
                                            {groupInfo.name}
                                        </span>
                                        <span className="flex items-center gap-1 truncate font-semibold text-primary">
                                            <ArrowRight className="h-3 w-3 shrink-0" />
                                            {computedNewGroupName}
                                        </span>
                                    </>
                                ) : (
                                    <span className="truncate font-semibold text-foreground">
                                        {computedNewGroupName}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <span className="min-w-[130px] font-semibold text-muted-foreground">
                                Factura & Crédito:
                            </span>
                            <span className="flex-1 text-foreground">
                                {isCustomerChanged ? (
                                    <>
                                        Se actualizará el cliente de facturación
                                        a{' '}
                                        <strong className="text-foreground">
                                            {selectedCustomer?.name}
                                        </strong>
                                        .
                                    </>
                                ) : (
                                    <>
                                        Se re-sincronizará el cliente de
                                        facturación y crédito con{' '}
                                        <strong className="text-foreground">
                                            {selectedCustomer?.name}
                                        </strong>
                                        .
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-800 dark:text-blue-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>
                            <strong>Nota:</strong> Los pacientes asignados a
                            cada muestra individual dentro del grupo se
                            mantendrán sin modificaciones para preservar su
                            historial clínico.
                        </span>
                    </div>
                </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={!selectedCustomer || submitting}
                    className="min-w-[140px]"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Actualizando...
                        </>
                    ) : (
                        <>
                            {isCustomerChanged ? (
                                <Check className="mr-2 h-4 w-4" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {isCustomerChanged
                                ? 'Guardar Cambios'
                                : 'Actualizar y Sincronizar'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
