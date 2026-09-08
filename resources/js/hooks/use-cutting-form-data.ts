import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import CuttingFormDataController from '@/actions/App/Http/Controllers/CuttingFormDataController';

export interface CuttingCode {
    id: number;
    code: string;
    color: string;
}

export interface CuttingPrefix {
    id: number;
    prefix: string;
}

export interface CuttingSlideType {
    id: number;
    name: string;
}

export interface User {
    id: number;
    name: string;
}

export interface CuttingFormData {
    cuttingCodes: CuttingCode[];
    cuttingPrefixes: CuttingPrefix[];
    cuttingSlideTypes: CuttingSlideType[];
    users: User[];
    cuttings?: any[] | null;
    specimen?: {
        id: number;
        sequence_code: string;
    } | null;
}

interface UseCuttingFormDataOptions {
    enabled: boolean;
    specimenId?: number | null;
}

interface UseCuttingFormDataReturn {
    data: CuttingFormData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// Module-level in-memory cache for common catalogs
let cachedCuttingCatalogs: Partial<CuttingFormData> | null = null;

export function invalidateCuttingCatalogsCache() {
    cachedCuttingCatalogs = null;
}

/**
 * Fetches reference catalogs and specimen cuttings needed by the cuttings management sheet.
 */
export function useCuttingFormData({
    enabled,
    specimenId,
}: UseCuttingFormDataOptions): UseCuttingFormDataReturn {
    const [data, setData] = useState<CuttingFormData | null>(() => {
        if (cachedCuttingCatalogs && !specimenId) {
            return cachedCuttingCatalogs as CuttingFormData;
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

        const url = CuttingFormDataController.url({ query: queryParams });

        axios
            .get(url, {
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    const resData = response.data as CuttingFormData;
                    setData(resData);
                    cachedCuttingCatalogs = {
                        cuttingCodes: resData.cuttingCodes,
                        cuttingPrefixes: resData.cuttingPrefixes,
                        cuttingSlideTypes: resData.cuttingSlideTypes,
                        users: resData.users,
                    };
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        err?.response?.data?.message ||
                            'Error al cargar los datos de los cortes',
                    );
                    setIsLoading(false);
                }
            });
    }, [specimenId]);

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
