import { useForm } from '@inertiajs/react';
import { AlertTriangle, UserPlus, Building2, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    store as storeReferrer,
    update as updateReferrer,
} from '@/actions/App/Http/Controllers/ReferrerController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

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

interface SpecimenItem {
    id: number;
    sequence_code: string;
    status: string;
    created_at: string;
}

interface Props {
    referrer: Referrer | null;
    referrerTypes: ReferrerType[];
    onSuccess: () => void;
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

export default function ReferrerForm({
    referrer,
    referrerTypes,
    onSuccess,
    initialData,
    onSwitchToCreateNew,
    onSelectExistingReferrer,
}: Props) {
    const [currentReferrer, setCurrentReferrer] = useState<Referrer | null>(
        referrer,
    );

    useEffect(() => {
        setCurrentReferrer(referrer);
    }, [referrer]);

    const { data, setData, post, put, processing, errors } = useForm({
        name: initialData?.name || referrer?.name || '',
        referrer_type:
            initialData?.referrer_type ||
            referrer?.referrer_type?.toString() ||
            '',
        phone: initialData?.phone || referrer?.phone || '',
        email: initialData?.email || referrer?.email || '',
        address: initialData?.address || referrer?.address || '',
        notes: initialData?.notes || referrer?.notes || '',
    });

    const [isCheckingSpecimens, setIsCheckingSpecimens] = useState(false);
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isDuplicatePromptOpen, setIsDuplicatePromptOpen] = useState(false);
    const [existingDuplicateReferrer, setExistingDuplicateReferrer] =
        useState<Referrer | null>(null);
    const [affectedSpecimensInfo, setAffectedSpecimensInfo] = useState<{
        total: number;
        specimens: SpecimenItem[];
    } | null>(null);

    useEffect(() => {
        setData({
            name: initialData?.name || currentReferrer?.name || data.name || '',
            referrer_type:
                initialData?.referrer_type ||
                currentReferrer?.referrer_type?.toString() ||
                data.referrer_type ||
                '',
            phone:
                initialData?.phone ||
                currentReferrer?.phone ||
                data.phone ||
                '',
            email:
                initialData?.email ||
                currentReferrer?.email ||
                data.email ||
                '',
            address:
                initialData?.address ||
                currentReferrer?.address ||
                data.address ||
                '',
            notes:
                initialData?.notes ||
                currentReferrer?.notes ||
                data.notes ||
                '',
        });
    }, [currentReferrer, initialData]);

    const submitUpdate = () => {
        if (!currentReferrer) {
            return;
        }

        put(updateReferrer(currentReferrer.id).url, {
            onSuccess: () => {
                toast.success('Remitente actualizado');
                onSuccess();
            },
        });
    };

    const submitStore = () => {
        post(storeReferrer().url, {
            onSuccess: () => {
                toast.success('Remitente creado');
                onSuccess();
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isNotesChanged =
            currentReferrer &&
            (data.notes || '').trim() !== (currentReferrer.notes || '').trim();

        if (currentReferrer && isNotesChanged) {
            setIsCheckingSpecimens(true);
            const queryParams = new URLSearchParams({
                name: data.name.trim(),
                notes: data.notes.trim(),
            }).toString();

            fetch(`/referrers/${currentReferrer.id}/specimens?${queryParams}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Error al consultar muestras');
                    }

                    return res.json();
                })
                .then((resData) => {
                    setIsCheckingSpecimens(false);
                    setAffectedSpecimensInfo({
                        total: resData.total,
                        specimens: resData.specimens,
                    });

                    if (resData.existing_duplicate) {
                        setExistingDuplicateReferrer(
                            resData.existing_duplicate,
                        );
                        setIsDuplicatePromptOpen(true);
                    } else if (resData.total > 0) {
                        setIsPromptOpen(true);
                    } else {
                        submitUpdate();
                    }
                })
                .catch((err) => {
                    console.error(err);
                    setIsCheckingSpecimens(false);
                    submitUpdate();
                });
        } else if (currentReferrer) {
            submitUpdate();
        } else {
            submitStore();
        }
    };

    const handleSelectExistingDuplicate = () => {
        setIsDuplicatePromptOpen(false);

        if (existingDuplicateReferrer) {
            onSelectExistingReferrer?.(existingDuplicateReferrer);
            onSuccess();
        }
    };

    const handleIgnoreDuplicateAndProceed = () => {
        setIsDuplicatePromptOpen(false);

        if (affectedSpecimensInfo && affectedSpecimensInfo.total > 0) {
            setIsPromptOpen(true);
        } else {
            submitUpdate();
        }
    };

    const handleCreateNewReferrer = () => {
        setIsPromptOpen(false);
        setIsDuplicatePromptOpen(false);
        setCurrentReferrer(null);
        toast.info(
            'Formulario cambiado a "Nuevo Remitente". Haga clic en "Crear Remitente" para guardar.',
        );
        onSwitchToCreateNew?.({ ...data });
    };

    const isLoading = processing || isCheckingSpecimens;

    return (
        <>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 px-5 py-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Ej. Dr. Armando Casas"
                    />
                    {errors.name && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="referrer_type">Tipo de Remitente *</Label>
                    <Select
                        value={data.referrer_type}
                        onValueChange={(v) => setData('referrer_type', v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {referrerTypes.map((type) => (
                                <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                >
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.referrer_type && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.referrer_type}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="Ej. 9988-7766"
                        />
                        {errors.phone && (
                            <p className="text-sm font-medium text-destructive">
                                {errors.phone}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="doctor@ejemplo.com"
                        />
                        {errors.email && (
                            <p className="text-sm font-medium text-destructive">
                                {errors.email}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                        id="address"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        placeholder="Dirección del consultorio o clínica..."
                    />
                    {errors.address && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.address}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notes">Notas (Hospital/Clínica)</Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        placeholder="Observaciones adicionales..."
                        className="resize-none"
                        rows={3}
                    />
                    {errors.notes && (
                        <p className="text-sm font-medium text-destructive">
                            {errors.notes}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full md:w-auto"
                    >
                        {isLoading && <Spinner className="mr-2" />}
                        {currentReferrer
                            ? 'Guardar Cambios'
                            : 'Crear Remitente'}
                    </Button>
                </div>
            </form>

            {/* Duplicate Referrer Found Prompt */}
            <AlertDialog
                open={isDuplicatePromptOpen}
                onOpenChange={setIsDuplicatePromptOpen}
            >
                <AlertDialogContent className="w-full p-6 sm:max-w-[750px]">
                    <AlertDialogHeader className="space-y-3">
                        <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                            <Building2 className="h-6 w-6 shrink-0 text-amber-500" />
                            Remitente existente para este hospital encontrado
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-1 text-sm text-foreground/90">
                                <p className="text-sm leading-relaxed">
                                    Ya existe un remitente registrado a nombre
                                    de{' '}
                                    <strong className="font-semibold text-foreground">
                                        {existingDuplicateReferrer?.name}
                                    </strong>{' '}
                                    asociado al hospital/clínica{' '}
                                    <strong className="font-semibold text-foreground">
                                        {existingDuplicateReferrer?.notes}
                                    </strong>{' '}
                                    (ID: #{existingDuplicateReferrer?.id}).
                                </p>

                                <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                                        <UserCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                        ¿Desea seleccionar este remitente
                                        existente?
                                    </p>
                                    <p className="leading-relaxed">
                                        Al seleccionar el remitente existente se
                                        cerrará este formulario sin modificar el
                                        remitente actual, y se elegirá
                                        automáticamente{' '}
                                        <strong>
                                            {existingDuplicateReferrer?.name} (
                                            {existingDuplicateReferrer?.notes})
                                        </strong>{' '}
                                        en el menú de remitentes de la muestra.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                        <AlertDialogCancel
                            onClick={() => setIsDuplicatePromptOpen(false)}
                            className="mt-0"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5"
                            onClick={handleIgnoreDuplicateAndProceed}
                        >
                            Continuar editando de todos modos
                        </Button>
                        <Button
                            type="button"
                            className="gap-2 bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                            onClick={handleSelectExistingDuplicate}
                        >
                            <UserCheck className="h-4 w-4" />
                            Seleccionar Remitente Existente
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Hospital Update / Specimen Check Prompt */}
            <AlertDialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
                <AlertDialogContent className="w-full p-6 sm:max-w-[800px]">
                    <AlertDialogHeader className="space-y-3">
                        <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
                            ¿Confirmar actualización de Hospital/Clínica?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-1 text-sm text-foreground/90">
                                <p className="text-sm">
                                    El remitente{' '}
                                    <strong className="font-semibold text-foreground">
                                        {currentReferrer?.name}
                                    </strong>{' '}
                                    está siendo utilizado actualmente por{' '}
                                    <strong className="font-semibold text-foreground">
                                        {affectedSpecimensInfo?.total}{' '}
                                        muestra(s)
                                    </strong>
                                    :
                                </p>

                                <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 shadow-inner">
                                    {affectedSpecimensInfo?.specimens
                                        .slice(0, 24)
                                        .map((spec) => (
                                            <Badge
                                                key={spec.id}
                                                variant="secondary"
                                                className="px-2.5 py-1 font-mono text-xs font-semibold"
                                            >
                                                {spec.sequence_code}
                                            </Badge>
                                        ))}
                                    {(affectedSpecimensInfo?.total || 0) >
                                        24 && (
                                        <span className="self-center pl-1 text-xs font-semibold text-muted-foreground">
                                            +{' '}
                                            {(affectedSpecimensInfo?.total ||
                                                0) - 24}{' '}
                                            más
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
                                        <Building2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        Confirmación de Hospital/Clínica:
                                    </p>
                                    <p className="leading-relaxed">
                                        Si <strong>todas</strong> las muestras
                                        asociadas deben pertenecer al nuevo
                                        hospital/clínica, si es adecuado
                                        actualizar el hospital/clínica(
                                        <span className="font-bold underline underline-offset-2">
                                            {data.notes || 'Sin especificar'}
                                        </span>
                                        ).
                                    </p>
                                    <p className="leading-relaxed">
                                        Si desea que a las muestras anteriores
                                        no se les cambie el hospital/clínica le
                                        recomendamos que cree un nuevo remitente
                                        para el nuevo hospital/clínica, puede
                                        hacerlo desde el botón de abajo "Crear
                                        Nuevo Remitente", se le enviará
                                        automáticamente al formulario para
                                        crearlo con los datos del remitente
                                        actual.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                        <AlertDialogCancel
                            onClick={() => setIsPromptOpen(false)}
                            className="mt-0"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 border-primary/40 font-medium text-primary hover:bg-primary/5 hover:text-primary"
                            onClick={handleCreateNewReferrer}
                        >
                            <UserPlus className="h-4 w-4" />
                            Crear Nuevo Remitente
                        </Button>
                        <AlertDialogAction
                            onClick={() => {
                                setIsPromptOpen(false);
                                submitUpdate();
                            }}
                        >
                            Actualizar Remitente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
