import { useState, useEffect } from 'react';
import HeadingSheet from '@/components/heading-sheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ReferrerForm from './referrer-form';

interface ReferrerType {
    id: number;
    name: string;
}

interface Referrer {
    id: number;
    referrer_type: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
}

interface Props {
    referrer: Referrer | null;
    referrerTypes: ReferrerType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: {
        name?: string;
        referrer_type?: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
    } | null;
    onSwitchToCreateNew?: (data: {
        name: string;
        referrer_type: string;
        phone: string;
        email: string;
        address: string;
        notes: string;
    }) => void;
    onSelectExistingReferrer?: (existingReferrer: Referrer) => void;
}

export default function ReferrerSheet({
    referrer,
    referrerTypes,
    open,
    onOpenChange,
    onSuccess,
    initialData,
    onSwitchToCreateNew,
    onSelectExistingReferrer,
}: Props) {
    const [sheetReferrer, setSheetReferrer] = useState<Referrer | null>(
        referrer,
    );

    useEffect(() => {
        setSheetReferrer(referrer);
    }, [referrer, open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto sm:max-w-[540px]">
                <HeadingSheet
                    title={
                        sheetReferrer ? 'Editar Remitente' : 'Nuevo Remitente'
                    }
                    description={
                        sheetReferrer
                            ? 'Realice cambios en la información del remitente aquí.'
                            : 'Complete el formulario para registrar un nuevo remitente en el sistema.'
                    }
                />
                <ReferrerForm
                    referrer={sheetReferrer}
                    referrerTypes={referrerTypes}
                    initialData={initialData}
                    onSuccess={() => {
                        onSuccess?.();
                        onOpenChange(false);
                    }}
                    onSwitchToCreateNew={(formData) => {
                        setSheetReferrer(null);
                        onSwitchToCreateNew?.(formData);
                    }}
                    onSelectExistingReferrer={onSelectExistingReferrer}
                />
            </SheetContent>
        </Sheet>
    );
}
