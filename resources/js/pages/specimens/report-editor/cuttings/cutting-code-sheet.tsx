import React from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CuttingCodeForm from './cutting-code-form';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CuttingCodeSheet({ open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="z-[130] w-full max-w-[400px] overflow-y-auto sm:max-w-[450px]"
            >
                <HeadingSheet
                    title="Nuevo Código de Casete"
                    description="Complete los campos para registrar un nuevo código identificador de casete."
                />
                <div className="mt-6">
                    <CuttingCodeForm onSuccess={() => onOpenChange(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
