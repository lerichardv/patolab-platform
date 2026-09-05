import { usePage } from '@inertiajs/react';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import RentalPaymentForm from './rental-payment-form';
import type { Bank, Rental, Invoice } from './rental-payment-form';

export type { Bank, Rental, Invoice };

export interface RentalPaymentSheetProps {
    rental?: Rental | null;
    invoice?: Invoice | null;
    invoiceId?: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banks?: Bank[];
    rentals?: Rental[];
    onSuccess?: () => void;
}

function RentalPaymentFormSkeleton() {
    return (
        <div
            className="mt-6 space-y-6 px-5 pb-10"
            data-testid="rental-payment-skeleton"
        >
            {/* Section 1 Skeleton: Rental & Customer */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <Skeleton className="h-4 w-48" />
                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
            </div>

            {/* Section 2 Skeleton: Concepts & Amounts */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </div>

                {/* Additional Discount Toggle Skeleton */}
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-48" />
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                </div>

                {/* Custom Extra Charge Toggle Skeleton */}
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="space-y-1">
                        <Skeleton className="h-3.5 w-44" />
                        <Skeleton className="h-2.5 w-40" />
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                </div>

                {/* ISV Switch Skeleton */}
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-56" />
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                </div>
            </div>

            {/* Section 3 Skeleton: Payment Method */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-44 rounded-md" />
                </div>
            </div>

            {/* Section 4 Skeleton: Billing Resume */}
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between border-t pt-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                </div>
            </div>

            {/* Actions Skeleton */}
            <div className="flex justify-end gap-3 border-t pt-4">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-36 rounded-md" />
            </div>
        </div>
    );
}

export default function RentalPaymentSheet({
    rental,
    invoice,
    invoiceId,
    open,
    onOpenChange,
    banks,
    rentals,
    onSuccess,
}: RentalPaymentSheetProps) {
    const { props } = usePage() as any;

    // Lazy load state for options & invoice
    const [fetchedRentals, setFetchedRentals] = useState<Rental[]>([]);
    const [fetchedBanks, setFetchedBanks] = useState<Bank[]>([]);
    const [fetchedSettings, setFetchedSettings] = useState<
        Record<string, string>
    >({});
    const [fetchedInvoice, setFetchedInvoice] = useState<Invoice | null>(null);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    const isEditMode = Boolean(invoice || invoiceId);
    const currentInvoice = invoice || fetchedInvoice;

    const resolvedRentals =
        rentals && rentals.length > 0 ? rentals : fetchedRentals;
    const resolvedBanks = banks && banks.length > 0 ? banks : fetchedBanks;

    const resolvedSettings = useMemo(() => {
        return {
            ...(props.settings || {}),
            ...fetchedSettings,
        };
    }, [props.settings, fetchedSettings]);

    // Lazy load rentals, banks, settings, invoice if needed
    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFetchedInvoice(null);

            return;
        }

        const needsRentals = !rentals || rentals.length === 0;
        const needsBanks = !banks || banks.length === 0;
        const needsInvoice = Boolean(invoiceId && !invoice);

        if (needsRentals || needsBanks || needsInvoice) {
            setIsLoadingOptions(true);
            const targetUrl =
                typeof (window as any).route === 'function'
                    ? (window as any).route('rentals.options', {
                          invoice_id: invoiceId || invoice?.id,
                      })
                    : `/rentals/options?invoice_id=${invoiceId || invoice?.id || ''}`;

            fetch(targetUrl, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Error al cargar opciones');
                    }

                    return res.json();
                })
                .then((resData) => {
                    if (resData.rentals) {
                        setFetchedRentals(resData.rentals);
                    }

                    if (resData.banks) {
                        setFetchedBanks(resData.banks);
                    }

                    if (resData.settings) {
                        setFetchedSettings(resData.settings);
                    }

                    if (resData.invoice) {
                        setFetchedInvoice(resData.invoice);
                    }
                })
                .catch((err) => {
                    console.error('Error fetching rental options:', err);
                })
                .finally(() => {
                    setIsLoadingOptions(false);
                });
        }
    }, [open, rentals, banks, invoiceId, invoice]);

    const needsInvoiceLoading = isEditMode && !currentInvoice;
    const needsRentalsLoading = resolvedRentals.length === 0;
    const needsBanksLoading = resolvedBanks.length === 0;

    const isLoading =
        isLoadingOptions ||
        needsInvoiceLoading ||
        needsRentalsLoading ||
        needsBanksLoading;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="z-[100] w-full overflow-y-auto sm:max-w-[750px]">
                <HeadingSheet
                    title={
                        isEditMode
                            ? 'Editar Factura de Otro Cobro'
                            : 'Registrar Pago de Otro Cobro'
                    }
                    description={
                        isEditMode
                            ? 'Modifique la información del cobro, cliente, forma de pago y montos de la factura.'
                            : 'Configure el cobro, el cliente, e ingrese los datos de facturación y forma de pago.'
                    }
                />

                {isLoading ? (
                    <RentalPaymentFormSkeleton />
                ) : (
                    <RentalPaymentForm
                        key={
                            currentInvoice
                                ? `edit-${currentInvoice.id}`
                                : `new-${rental?.id || 'default'}`
                        }
                        rental={rental}
                        invoice={currentInvoice}
                        isEditMode={isEditMode}
                        banks={resolvedBanks}
                        rentals={resolvedRentals}
                        settings={resolvedSettings}
                        onSuccess={onSuccess}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
