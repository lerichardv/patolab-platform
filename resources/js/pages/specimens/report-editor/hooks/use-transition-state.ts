import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { Specimen, SpecimenStatus, SpecimenUserRelation } from '../types';

export interface UseTransitionStateOptions {
    specimen: Specimen;
    statusDoc: Y.Doc | null;
    specimenStatusRef: React.MutableRefObject<SpecimenStatus>;
    setSessionEditingEnabled: (enabled: boolean) => void;
}

export function useTransitionState({
    specimen,
    statusDoc,
    specimenStatusRef,
    setSessionEditingEnabled,
}: UseTransitionStateOptions) {
    const [unsignedPathologists, setUnsignedPathologists] = useState<
        SpecimenUserRelation[]
    >([]);
    const [showSignatureWarning, setShowSignatureWarning] = useState(false);

    const handleTransitionState = useCallback(
        (targetStatus: SpecimenStatus) => {
            if (targetStatus === 'finalized') {
                const unsignedUsers =
                    specimen.users?.filter(
                        (u) => !u.user_signature && !u.signature_url,
                    ) || [];

                if (unsignedUsers.length > 0) {
                    setUnsignedPathologists(unsignedUsers);
                    setShowSignatureWarning(true);
                    toast.error('Faltan firmas de patólogos');

                    return;
                }
            }

            router.post(
                `/specimens/${specimen.sequence_code}/report-editor/transition-state`,
                {
                    status: targetStatus,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success('Estado del proceso actualizado');

                        if (statusDoc) {
                            const ytext = statusDoc.getText('content');
                            specimenStatusRef.current = targetStatus;
                            statusDoc.transact(() => {
                                ytext.delete(0, ytext.length);
                                ytext.insert(0, targetStatus);
                            });
                        }

                        setSessionEditingEnabled(false);
                    },
                    onError: (errors) => {
                        if (errors && errors.error) {
                            toast.error(errors.error);
                        } else if (errors && typeof errors === 'object') {
                            const firstKey = Object.keys(errors)[0];

                            if (firstKey && errors[firstKey]) {
                                toast.error(errors[firstKey] as string);
                            } else {
                                toast.error(
                                    'Error al actualizar el estado del proceso',
                                );
                            }
                        } else {
                            toast.error(
                                'Error al actualizar el estado del proceso',
                            );
                        }
                    },
                },
            );
        },
        [specimen, statusDoc, specimenStatusRef, setSessionEditingEnabled],
    );

    const completeMacroscopy = useCallback(() => {
        handleTransitionState('processing');
    }, [handleTransitionState]);

    const startMicroscopy = useCallback(() => {
        handleTransitionState('microscopic_review');
    }, [handleTransitionState]);

    const finalizeReport = useCallback(() => {
        handleTransitionState('finalized');
    }, [handleTransitionState]);

    return {
        handleTransitionState,
        completeMacroscopy,
        startMicroscopy,
        finalizeReport,
        unsignedPathologists,
        setUnsignedPathologists,
        showSignatureWarning,
        setShowSignatureWarning,
    };
}

export default useTransitionState;
