import axios from 'axios';
import { useState, useEffect } from 'react';

export interface Referrer {
    id: number;
    name: string;
    notes?: string | null;
}

export interface SpecimenCategory {
    id: number;
    name: string;
}

export interface Priority {
    id: number;
    name: string;
    color: string;
    order: number;
}

export interface QuickEditMetadata {
    referrers: Referrer[];
    categories: SpecimenCategory[];
    priorities: Priority[];
}

export function useSpecimenQuickEditMetadata(enabled: boolean = true) {
    const [metadata, setMetadata] = useState<QuickEditMetadata | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let isMounted = true;
        setLoading(true);
        axios
            .get('/specimens/quick-edit-metadata')
            .then((response) => {
                if (isMounted) {
                    setMetadata(response.data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [enabled]);

    return { metadata, loading, error };
}
