import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import PriceQuoteFormDataController from '@/actions/App/Http/Controllers/PriceQuoteFormDataController';

export interface PriceQuoteFormData {
    priceQuote?: any;
    specimenTypes: any[];
    specimenCategories: any[];
    examinations: any[];
    settings: Record<string, string>;
}

interface UsePriceQuoteFormDataOptions {
    enabled: boolean;
    priceQuoteId?: number | string | null;
}

interface UsePriceQuoteFormDataReturn {
    data: PriceQuoteFormData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// Module-level in-memory cache for common catalogs
let cachedPriceQuoteCatalogs: Partial<PriceQuoteFormData> | null = null;

export function invalidatePriceQuoteCatalogsCache() {
    cachedPriceQuoteCatalogs = null;
}

/**
 * Fetches reference data and optional price quote details needed by the price quote sheet.
 */
export function usePriceQuoteFormData({
    enabled,
    priceQuoteId,
}: UsePriceQuoteFormDataOptions): UsePriceQuoteFormDataReturn {
    const [data, setData] = useState<PriceQuoteFormData | null>(() => {
        if (cachedPriceQuoteCatalogs && !priceQuoteId) {
            return cachedPriceQuoteCatalogs as PriceQuoteFormData;
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

        if (priceQuoteId) {
            queryParams.price_quote_id = priceQuoteId.toString();
        }

        const url = PriceQuoteFormDataController.url({ query: queryParams });

        axios
            .get(url, {
                signal: controller.signal,
            })
            .then((response) => {
                const responseData: PriceQuoteFormData = response.data;

                // Cache reference catalogs
                if (
                    responseData.specimenTypes &&
                    responseData.specimenCategories &&
                    responseData.examinations
                ) {
                    cachedPriceQuoteCatalogs = {
                        specimenTypes: responseData.specimenTypes,
                        specimenCategories: responseData.specimenCategories,
                        examinations: responseData.examinations,
                        settings: responseData.settings,
                    };
                }

                setData(responseData);
                setIsLoading(false);
            })
            .catch((err) => {
                if (axios.isCancel(err) || err.name === 'CanceledError') {
                    return;
                }

                console.error('Error fetching price quote form data:', err);
                setError(
                    'No se pudieron cargar los datos del formulario. Por favor intente de nuevo.',
                );
                setIsLoading(false);
            });
    }, [priceQuoteId]);

    useEffect(() => {
        if (!enabled) {
            abortControllerRef.current?.abort();
            setIsLoading(false);

            return;
        }

        // If creating a new quote and catalogs are already cached, use them
        if (!priceQuoteId && cachedPriceQuoteCatalogs) {
            setData(cachedPriceQuoteCatalogs as PriceQuoteFormData);
            setIsLoading(false);

            return;
        }

        fetchData();

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [enabled, priceQuoteId, fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData,
    };
}
