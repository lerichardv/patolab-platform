import React from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CuttingCodeForm from './cutting-code-form';

interface CuttingCode {
    id: number;
    code: string;
    color: string;
}

interface Props {
    cuttingCode?: CuttingCode | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CuttingCodeSheet({
    cuttingCode,
    open,
    onOpenChange,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="z-[130] w-full max-w-[400px] overflow-y-auto sm:max-w-[480px]"
            >
                <HeadingSheet
                    title={
                        cuttingCode
                            ? 'Editar Código de Casete'
                            : 'Nuevo Código de Casete'
                    }
                    description={
                        cuttingCode
                            ? 'Actualice la información del código de casete aquí.'
                            : 'Complete los campos para registrar uno o más códigos identificadores de casete.'
                    }
                />
                <div className="mt-6">
                    <CuttingCodeForm
                        cuttingCode={cuttingCode}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
