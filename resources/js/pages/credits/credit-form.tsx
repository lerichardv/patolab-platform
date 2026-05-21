import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormEventHandler, useEffect } from 'react';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { FileText, Upload, X } from 'lucide-react';
import { pay as payCredit } from '@/actions/App/Http/Controllers/CreditController';

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
}

interface Props {
    credit: Credit;
    onSuccess: () => void;
}

export default function CreditForm({ credit, onSuccess }: Props) {
    const remainingVal = parseFloat(String(credit.amount_remaining));

    const { data, setData, post, processing, errors, reset } = useForm({
        amount_paid: remainingVal.toFixed(2),
        payment_type: 'cash',
        proof_of_payment: null as File | null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (parseFloat(data.amount_paid) <= 0) {
            toast.error('El monto a pagar debe ser mayor que cero');
            return;
        }

        if (parseFloat(data.amount_paid) > remainingVal) {
            toast.error('El monto a pagar no puede superar el saldo pendiente');
            return;
        }

        if (!data.proof_of_payment) {
            toast.error('El comprobante de pago es requerido');
            return;
        }

        // We use standard POST request because we are uploading files.
        // Inertia.post handles FormData automatically when files are present in the form data.
        post(payCredit(credit.id).url, {
            onSuccess: () => {
                toast.success('Pago de crédito registrado con éxito');
                onSuccess();
                reset();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-5 py-4 px-5">
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Detalles del Crédito
                </h3>
                <div className="bg-muted/40 border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-semibold text-foreground">{credit.customer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">ID / RTN:</span>
                        <span className="font-semibold text-foreground">{credit.customer?.id_number}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">Monto Total de Crédito:</span>
                        <span className="font-semibold text-foreground">L. {parseFloat(String(credit.credit_amount)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Monto Pagado:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">L. {parseFloat(String(credit.amount_paid)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 font-bold text-base">
                        <span className="text-primary">Saldo Restante:</span>
                        <span className="text-destructive">L. {remainingVal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label htmlFor="amount_paid">Monto a Pagar (L.) *</Label>
                    <Input
                        id="amount_paid"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remainingVal}
                        value={data.amount_paid}
                        onChange={(e) => setData('amount_paid', e.target.value)}
                        placeholder="0.00"
                        required
                    />
                    <InputError message={errors.amount_paid} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="payment_type">Tipo de Pago *</Label>
                    <Select value={data.payment_type} onValueChange={(value) => setData('payment_type', value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione el tipo de pago" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="credit card">Tarjeta de Crédito</SelectItem>
                            <SelectItem value="bank transfer">Transferencia Bancaria</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.payment_type} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="proof_of_payment">Comprobante de Pago (PDF o Imagen) *</Label>

                    {data.proof_of_payment && (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-md text-emerald-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">
                                        {data.proof_of_payment.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {(data.proof_of_payment.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setData('proof_of_payment', null)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {!data.proof_of_payment && (
                        <div className="relative group">
                            <input
                                type="file"
                                id="proof_of_payment"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setData('proof_of_payment', file);
                                }}
                            />
                            <label
                                htmlFor="proof_of_payment"
                                className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-lg p-5 cursor-pointer bg-card hover:bg-accent/10 transition-all duration-200"
                            >
                                <div className="p-2.5 bg-secondary rounded-full text-secondary-foreground group-hover:scale-110 transition-transform duration-200 mb-2">
                                    <Upload className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">
                                    Subir Comprobante
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-1">
                                    PDF hasta 30MB, imágenes hasta 10MB
                                </span>
                            </label>
                        </div>
                    )}
                    <InputError message={errors.proof_of_payment} />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                    {processing ? 'Registrando...' : 'Registrar Pago'}
                </Button>
            </div>
        </form>
    );
}
