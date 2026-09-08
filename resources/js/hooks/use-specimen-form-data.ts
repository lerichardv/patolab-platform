import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import SpecimenFormDataController from '@/actions/App/Http/Controllers/SpecimenFormDataController';

export interface SpecimenFormData {
    specimen?: any;
    group?: any;
    invoiceSpecimens?: any[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    referrerTypes: any[];
    priorities: any[];
    locations: any[];
    sequences: any[];
    activeLocationId: number | null;
    products: any[];
    banks: any[];
    settings: Record<string, string>;
}

interface UseSpecimenFormDataOptions {
    enabled: boolean;
    specimenId?: number | null;
    groupId?: number | null;
}

interface UseSpecimenFormDataReturn {
    data: SpecimenFormData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// Module-level in-memory cache for common catalogs to allow instant re-renders
let cachedCatalogs: Partial<SpecimenFormData> | null = null;

export function invalidateSpecimenCatalogsCache() {
    cachedCatalogs = null;
}

/**
 * Fetches reference data and entity details needed by the specimen form sheets.
 *
 * While the initial request is in-flight, `isLoading` is true.
 * If common catalogs have already been fetched, they can be utilized to prevent
 * unnecessary empty screens while still re-fetching fresh sequence numbers.
 */
export function useSpecimenFormData({
    enabled,
    specimenId,
    groupId,
}: UseSpecimenFormDataOptions): UseSpecimenFormDataReturn {
    const [data, setData] = useState<SpecimenFormData | null>(() => {
        // If we only need reference data (no specific specimen or group), initialize from cache
        if (cachedCatalogs && !specimenId && !groupId) {
            return cachedCatalogs as SpecimenFormData;
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

        if (specimenId) {
            queryParams.specimen_id = specimenId.toString();
        }

        if (groupId) {
            queryParams.group_id = groupId.toString();
        }

        const url = SpecimenFormDataController.url({ query: queryParams });

        axios
            .get(url, {
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    const resData = response.data as SpecimenFormData;
                    setData(resData);
                    cachedCatalogs = {
                        specimenTypes: resData.specimenTypes,
                        examinations: resData.examinations,
                        categories: resData.categories,
                        referrers: resData.referrers,
                        referrerTypes: resData.referrerTypes,
                        priorities: resData.priorities,
                        locations: resData.locations,
                        products: resData.products,
                        banks: resData.banks,
                        settings: resData.settings,
                        activeLocationId: resData.activeLocationId,
                    };
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        err?.response?.data?.message ||
                            'Error al cargar los datos del formulario',
                    );
                    setIsLoading(false);
                }
            });
    }, [specimenId, groupId]);

    useEffect(() => {
        if (enabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchData();
        } else {
            // When closed, abort pending requests
            abortControllerRef.current?.abort();
            setIsLoading(false);
        }

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [enabled, fetchData]);

    return { data, isLoading, error, refetch: fetchData };
}
