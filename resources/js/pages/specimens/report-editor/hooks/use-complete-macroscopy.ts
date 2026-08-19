import { useCallback } from 'react';
import type { SpecimenStatus } from '../types';

export function useCompleteMacroscopy(
    onTransitionState: (state: SpecimenStatus) => void,
) {
    const completeMacroscopy = useCallback(() => {
        onTransitionState('processing');
    }, [onTransitionState]);

    return { completeMacroscopy };
}

export default useCompleteMacroscopy;
