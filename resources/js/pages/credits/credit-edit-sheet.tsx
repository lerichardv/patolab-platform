import { useForm } from '@inertiajs/react';
import { Minus, Plus, Settings, Calendar, Bell } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { update as updateCredit } from '@/actions/App/Http/Controllers/CreditController';
import HeadingSheet from '@/components/heading-sheet';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';

interface Customer {
    id: number;
    name: string;
    id_number: string;
}

interface Credit {
    id: number;
    customer_id: number;
    credit_amount: string | number;
    amount_paid: string | number;
    amount_remaining: string | number;
    customer?: Customer;
    reminder_interval_in_seconds?: number;
    last_payment_date?: string | null;
    created_at?: string;
}

interface Props {
    credit: Credit | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreditEditSheet({ credit, open, onOpenChange }: Props) {
    const defaultDays = credit?.reminder_interval_in_seconds
        ? Math.round(credit.reminder_interval_in_seconds / 86400)
        : 7;

    const { data, setData, put, processing, errors, reset } = useForm({
        reminder_interval_in_days: defaultDays.toString(),
    });

    useEffect(() => {
        if (credit) {
            const days = credit.reminder_interval_in_seconds
                ? Math.round(credit.reminder_interval_in_seconds / 86400)
                : 7;
            setData('reminder_interval_in_days', days.toString());
        }
    }, [credit]);

    const handleIncrement = () => {
        const val = parseInt(data.reminder_interval_in_days) || 1;
        setData('reminder_interval_in_days', (val + 1).toString());
    };

    const handleDecrement = () => {
        const val = parseInt(data.reminder_interval_in_days) || 1;
        setData('reminder_interval_in_days', Math.max(1, val - 1).toString());
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!credit) {
            return;
        }

        const days = parseInt(data.reminder_interval_in_days);

        if (isNaN(days) || days < 1) {
            toast.error(
                'El intervalo de recordatorio debe ser de al menos 1 día',
            );

            return;
        }

        put(updateCredit(credit.id).url, {
            onSuccess: () => {
                toast.success('Configuración de crédito actualizada con éxito');
                onOpenChange(false);
            },
            onError: (err) => {
                toast.error('Ocurrió un error al actualizar los datos');
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <HeadingSheet
                    title="Editar Configuración de Crédito"
                    description="Configure el intervalo de alertas y recordatorios para este crédito."
                />

                {credit && (
                    <form onSubmit={submit} className="space-y-6 px-5 py-4">
                        <div>
                            <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Información General
                            </h3>
                            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Cliente:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {credit.customer?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        ID / RTN:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {credit.customer?.id_number}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-border/50 pt-2">
                                    <span className="text-muted-foreground">
                                        Monto Total:
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        L.{' '}
                                        {parseFloat(
                                            String(credit.credit_amount),
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Saldo Restante:
                                    </span>
                                    <span className="font-semibold text-destructive">
                                        L.{' '}
                                        {parseFloat(
                                            String(credit.amount_remaining),
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Ajustes de Recordatorio
                            </h3>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="reminder_interval_in_days"
                                    className="flex items-center gap-1.5 text-sm font-medium"
                                >
                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                    Intervalo de Recordatorio (Días) *
                                </Label>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 select-none"
                                        onClick={handleDecrement}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        id="reminder_interval_in_days"
                                        type="number"
                                        min="1"
                                        value={data.reminder_interval_in_days}
                                        onChange={(e) =>
                                            setData(
                                                'reminder_interval_in_days',
                                                e.target.value,
                                            )
                                        }
                                        className="h-10 text-center font-mono text-base"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 select-none"
                                        onClick={handleIncrement}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <span className="block pt-1 text-xs text-muted-foreground">
                                    Define cada cuántos días se enviará un
                                    recordatorio automático de cobro al cliente.
                                    El valor se almacenará como{' '}
                                    {parseInt(data.reminder_interval_in_days) *
                                        86400 || 0}{' '}
                                    segundos en la base de datos.
                                </span>
                                <InputError
                                    message={errors.reminder_interval_in_days}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="min-w-[120px]"
                            >
                                {processing && <Spinner className="mr-2" />}
                                {processing
                                    ? 'Guardando...'
                                    : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}
