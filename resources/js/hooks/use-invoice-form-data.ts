import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import InvoiceFormDataController from '@/actions/App/Http/Controllers/InvoiceFormDataController';

export interface InvoiceFormData {
    invoice?: any;
    banks: any[];
    specimenTypes: any[];
    examinations: any[];
    settings: Record<string, string>;
}

interface UseInvoiceFormDataOptions {
    enabled: boolean;
    invoiceId?: number | null;
}

interface UseInvoiceFormDataReturn {
    data: InvoiceFormData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// Module-level in-memory cache for common catalogs
let cachedInvoiceCatalogs: Partial<InvoiceFormData> | null = null;

export function invalidateInvoiceCatalogsCache() {
    cachedInvoiceCatalogs = null;
}

/**
 * Fetches reference data and full invoice details needed by the invoice edit sheet.
 */
export function useInvoiceFormData({
    enabled,
    invoiceId,
}: UseInvoiceFormDataOptions): UseInvoiceFormDataReturn {
    const [data, setData] = useState<InvoiceFormData | null>(() => {
        if (cachedInvoiceCatalogs && !invoiceId) {
            return cachedInvoiceCatalogs as InvoiceFormData;
        }

        return null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(() => {
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        const queryParams: Record<string, string> = {};

        if (invoiceId) {
            queryParams.invoice_id = invoiceId.toString();
        }

        const url = InvoiceFormDataController.url({ query: queryParams });

        axios
            .get(url, {
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    const resData = response.data as InvoiceFormData;
                    setData(resData);
                    cachedInvoiceCatalogs = {
                        banks: resData.banks,
                        specimenTypes: resData.specimenTypes,
                        examinations: resData.examinations,
                        settings: resData.settings,
                    };
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        err?.response?.data?.message ||
                            'Error al cargar los datos de la factura',
                    );
                    setIsLoading(false);
                }
            });
    }, [invoiceId]);

    useEffect(() => {
        if (enabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchData();
        } else {
            abortControllerRef.current?.abort();
            setIsLoading(false);
        }

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [enabled, fetchData]);

    return { data, isLoading, error, refetch: fetchData };
}
