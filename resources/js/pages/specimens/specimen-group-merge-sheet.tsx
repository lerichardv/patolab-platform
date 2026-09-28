import axios from 'axios';
import { useState, useEffect } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { MergeGroupData } from './specimen-group-merge-form';
import SpecimenGroupMergeForm from './specimen-group-merge-form';
import SpecimenGroupMergeSkeleton from './specimen-group-merge-skeleton';

interface Props {
    groupId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function SpecimenGroupMergeSheet({
    groupId,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    const [targetGroupData, setTargetGroupData] = useState<MergeGroupData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState<number>(0);

    useEffect(() => {
        let isCancelled = false;

        if (open && groupId) {
            axios
                .get(`/specimen-groups/${groupId}/merge-data`)
                .then((response) => {
                    if (!isCancelled) {
                        setTargetGroupData(response.data);
                        setIsLoading(false);
                    }
                })
                .catch((err) => {
                    if (!isCancelled) {
                        setError(
                            err.response?.data?.message ||
                                'Error al cargar la información del grupo destino.',
                        );
                        setIsLoading(false);
                    }
                });
        }

        return () => {
            isCancelled = true;
        };
    }, [open, groupId, retryCount]);

    const handleRetry = () => {
        setIsLoading(true);
        setError(null);
        setRetryCount((prev) => prev + 1);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[750px] md:max-w-[850px] lg:max-w-[900px]">
                <HeadingSheet
                    title="Fusionar Grupo de Muestras"
                    description="Reincorpore muestras separadas fusionando otro grupo dentro de este grupo destino. Si algún grupo es a crédito, ambos deben ser a crédito para fusionarse."
                />

                {isLoading ? (
                    <SpecimenGroupMergeSkeleton />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                        <p className="text-sm font-medium text-destructive">{error}</p>
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            Reintentar
                        </Button>
                    </div>
                ) : targetGroupData ? (
                    <SpecimenGroupMergeForm
                        targetGroup={targetGroupData}
                        onSuccess={() => {
                            onSuccess?.();
                            onOpenChange(false);
                        }}
                        onCancel={() => onOpenChange(false)}
                    />
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
