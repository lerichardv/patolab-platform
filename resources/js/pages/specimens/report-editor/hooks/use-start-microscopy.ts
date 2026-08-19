import { useCallback } from 'react';
import type { SpecimenStatus } from '../types';

export function useStartMicroscopy(
    onTransitionState: (state: SpecimenStatus) => void,
) {
    const startMicroscopy = useCallback(() => {
        onTransitionState('microscopic_review');
    }, [onTransitionState]);

    return { startMicroscopy };
}

export default useStartMicroscopy;
