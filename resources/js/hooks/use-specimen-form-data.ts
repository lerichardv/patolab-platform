import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * Fetches all reference data needed by the specimen form sheets.
 *
 * Data is fetched fresh every time `enabled` becomes true, ensuring
 * the forms always display the most up-to-date information.
 */
export function useSpecimenFormData({
    enabled,
    specimenId,
    groupId,
}: UseSpecimenFormDataOptions): UseSpecimenFormDataReturn {
    const [data, setData] = useState<SpecimenFormData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(() => {
        // Cancel any in-flight request
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        const params: Record<string, string> = {};
        if (specimenId) {
            params.specimen_id = specimenId.toString();
        }
        if (groupId) {
            params.group_id = groupId.toString();
        }

        axios
            .get('/specimens/form-data', {
                params,
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    setData(response.data);
                    console.log(response.data);
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
            fetchData();
        } else {
            // Reset state when sheet closes
            setData((prev) => (prev !== null ? null : prev));
            setError((prev) => (prev !== null ? null : prev));
            setIsLoading(false);
            abortControllerRef.current?.abort();
        }

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [enabled, fetchData]);

    return { data, isLoading, error, refetch: fetchData };
}
