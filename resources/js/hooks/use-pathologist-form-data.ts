import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import PathologistFormDataController from '@/actions/App/Http/Controllers/PathologistFormDataController';

export interface PathologistUser {
    id: number;
    name: string;
    email: string;
    role_id?: number;
    pivot?: {
        macroscopy_access?: boolean;
        microscopy_access?: boolean;
    };
}

export interface PathologistFormData {
    pathologists: PathologistUser[];
    usersList: PathologistUser[];
    specimen?: any | null;
}

interface UsePathologistFormDataOptions {
    enabled: boolean;
    specimenId?: number | null;
}

interface UsePathologistFormDataReturn {
    data: PathologistFormData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// Module-level in-memory cache for common catalogs
let cachedPathologistCatalogs: Partial<PathologistFormData> | null = null;

export function invalidatePathologistCatalogsCache() {
    cachedPathologistCatalogs = null;
}

/**
 * Fetches pathologists, collaborator users, and optional fresh specimen data
 * needed by pathologist assignment sheets.
 */
export function usePathologistFormData({
    enabled,
    specimenId,
}: UsePathologistFormDataOptions): UsePathologistFormDataReturn {
    const [data, setData] = useState<PathologistFormData | null>(() => {
        if (cachedPathologistCatalogs && !specimenId) {
            return cachedPathologistCatalogs as PathologistFormData;
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

        const url = PathologistFormDataController.url({ query: queryParams });

        axios
            .get(url, {
                signal: controller.signal,
            })
            .then((response) => {
                if (!controller.signal.aborted) {
                    const resData = response.data as PathologistFormData;
                    setData(resData);
                    cachedPathologistCatalogs = {
                        pathologists: resData.pathologists,
                        usersList: resData.usersList,
                    };
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (axios.isCancel(err) || err.name === 'CanceledError') {
                    return;
                }

                if (!controller.signal.aborted) {
                    setError(
                        err.response?.data?.message ||
                            'Error al cargar datos de patólogos',
                    );
                    setIsLoading(false);
                }
            });
    }, [specimenId]);

    useEffect(() => {
        if (!enabled) {
            abortControllerRef.current?.abort();

            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [enabled, fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData,
    };
}
