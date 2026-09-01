import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useNetworkErrorToast(): void {
    useEffect(() => {
        return router.on('networkError', (event) => {
            event.preventDefault();
            toast.error(
                'Problema de conexión con el servidor o pérdida de internet. Por favor verifique su conexión e intente nuevamente.',
            );

            return false;
        });
    }, []);
}
