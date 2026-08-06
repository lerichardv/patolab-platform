import { usePage } from '@inertiajs/react';
import React from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CuttingPrefixForm from './cutting-prefix-form';

interface CuttingPrefix {
    id: number;
    prefix: string;
}

interface Props {
    cuttingPrefix?: CuttingPrefix | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CuttingPrefixSheet({
    cuttingPrefix,
    open,
    onOpenChange,
}: Props) {
    const { props } = usePage() as any;
    const hasPrefixesPermission =
        props.auth?.user?.role?.slug === 'admin' ||
        props.auth?.permissions?.includes('cutting_prefixes.create') ||
        props.auth?.permissions?.includes('cutting_prefixes.edit');

    if (!hasPrefixesPermission) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="z-[130] w-full max-w-[400px] overflow-y-auto sm:max-w-[480px]"
            >
                <HeadingSheet
                    title={
                        cuttingPrefix
                            ? 'Editar Prefijo de Corte'
                            : 'Nuevo Prefijo de Corte'
                    }
                    description={
                        cuttingPrefix
                            ? 'Actualice la información del prefijo de corte aquí.'
                            : 'Complete los campos para registrar uno o más prefijos de cortes.'
                    }
                />
                <div className="mt-6">
                    <CuttingPrefixForm
                        cuttingPrefix={cuttingPrefix}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
