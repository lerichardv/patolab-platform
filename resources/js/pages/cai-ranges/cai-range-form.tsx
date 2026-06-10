import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
    store as storeCaiRange,
    update as updateCaiRange,
} from '@/actions/App/Http/Controllers/CaiRangeController';
import InputError from '@/components/input-error';
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

interface Location {
    id: number;
    name: string;
}

interface CaiRange {
    id?: number;
    location_id: number | string;
    cai: string;
    full_prefix: string;
    emission: string;
    establishment: string;
    document_type: string;
    start_number: number | string;
    end_number: number | string;
    last_used_number: number | string;
    deadline: string;
    status: 'active' | 'exhausted' | 'expired';
    limit_percentage_warning: number | string;
    limit_days_warning: number | string;
    warning_notifications_amount: number | string;
    warning_notifications_sent: number | string;
}

interface Props {
    caiRange?: CaiRange;
    locations: Location[];
    onSuccess: () => void;
}

export default function CaiRangeForm({
    caiRange,
    locations,
    onSuccess,
}: Props) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) {
            return '';
        }

        // Extract YYYY-MM-DD from datetime
        return dateStr.split('T')[0];
    };

    const { data, setData, post, put, processing, errors, reset } = useForm({
        location_id: caiRange?.location_id
            ? caiRange.location_id.toString()
            : '',
        cai: caiRange?.cai || '',
        full_prefix: caiRange?.full_prefix || '',
        emission: caiRange?.emission || '',
        establishment: caiRange?.establishment || '',
        document_type: caiRange?.document_type || '',
        start_number: caiRange?.start_number || '',
        end_number: caiRange?.end_number || '',
        last_used_number: caiRange?.last_used_number || '0',
        deadline: formatDate(caiRange?.deadline),
        status: caiRange?.status || 'active',
        limit_percentage_warning: caiRange?.limit_percentage_warning || '10',
        limit_days_warning: caiRange?.limit_days_warning || '15',
        warning_notifications_amount:
            caiRange?.warning_notifications_amount || '3',
        warning_notifications_sent: caiRange?.warning_notifications_sent || '0',
    });

    // Auto-update full_prefix when prefix parts change
    useEffect(() => {
        if (data.emission || data.establishment || data.document_type) {
            const emissionPart = data.emission
                ? data.emission.padStart(3, '0').substring(0, 3)
                : '000';
            const establishmentPart = data.establishment
                ? data.establishment.padStart(3, '0').substring(0, 3)
                : '000';
            const docTypePart = data.document_type
                ? data.document_type.padStart(2, '0').substring(0, 2)
                : '00';
            setData(
                'full_prefix',
                `${emissionPart}-${establishmentPart}-${docTypePart}-`,
            );
        }
    }, [data.emission, data.establishment, data.document_type]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const submitOptions = {
            onSuccess: () => {
                toast.success(
                    caiRange?.id
                        ? 'Rango de facturación actualizado'
                        : 'Rango de facturación creado',
                );
                onSuccess();

                if (!caiRange?.id) {
                    reset();
                }
            },
        };

        if (caiRange?.id) {
            put(updateCaiRange(caiRange.id).url, submitOptions);
        } else {
            post(storeCaiRange().url, submitOptions);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="location_id">Sucursal *</Label>
                    <Select
                        value={data.location_id}
                        onValueChange={(value) => setData('location_id', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione la sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem
                                    key={loc.id}
                                    value={loc.id.toString()}
                                >
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.location_id} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Estado *</Label>
                    <Select
                        value={data.status}
                        onValueChange={(
                            value: 'active' | 'exhausted' | 'expired',
                        ) => setData('status', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione el estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="exhausted">Agotado</SelectItem>
                            <SelectItem value="expired">Expirado</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.status} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="cai">Clave CAI *</Label>
                <Input
                    id="cai"
                    value={data.cai}
                    onChange={(e) => setData('cai', e.target.value)}
                    placeholder="Ej. 3B82F6-8B5CF6-F59E0B-D946EF-10B981-5E"
                />
                <InputError message={errors.cai} />
            </div>

            <div className="my-2 border-b border-muted"></div>
            <h3 className="text-sm font-semibold text-muted-foreground">
                Configuración del Prefijo
            </h3>

            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label htmlFor="emission" className="text-xs">
                        Establecimiento (000) *
                    </Label>
                    <Input
                        id="emission"
                        value={data.emission}
                        onChange={(e) => setData('emission', e.target.value)}
                        placeholder="000"
                        maxLength={3}
                    />
                    <InputError message={errors.emission} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="establishment" className="text-xs">
                        Punto Emisión (001) *
                    </Label>
                    <Input
                        id="establishment"
                        value={data.establishment}
                        onChange={(e) =>
                            setData('establishment', e.target.value)
                        }
                        placeholder="001"
                        maxLength={3}
                    />
                    <InputError message={errors.establishment} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="document_type" className="text-xs">
                        Tipo Documento (01) *
                    </Label>
                    <Input
                        id="document_type"
                        value={data.document_type}
                        onChange={(e) =>
                            setData('document_type', e.target.value)
                        }
                        placeholder="01"
                        maxLength={2}
                    />
                    <InputError message={errors.document_type} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="full_prefix">
                    Prefijo Completo (Generado automáticamente)
                </Label>
                <Input
                    id="full_prefix"
                    value={data.full_prefix}
                    disabled
                    className="bg-muted font-mono text-muted-foreground"
                />
                <InputError message={errors.full_prefix} />
            </div>

            <div className="my-2 border-b border-muted"></div>
            <h3 className="text-sm font-semibold text-muted-foreground">
                Rango Numérico y Límites
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="start_number">Número Inicial *</Label>
                    <Input
                        id="start_number"
                        type="number"
                        value={data.start_number}
                        onChange={(e) =>
                            setData('start_number', e.target.value)
                        }
                        placeholder="1"
                    />
                    <InputError message={errors.start_number} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end_number">Número Final *</Label>
                    <Input
                        id="end_number"
                        type="number"
                        value={data.end_number}
                        onChange={(e) => setData('end_number', e.target.value)}
                        placeholder="1000"
                    />
                    <InputError message={errors.end_number} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="last_used_number">Último Utilizado *</Label>
                    <Input
                        id="last_used_number"
                        type="number"
                        value={data.last_used_number}
                        onChange={(e) =>
                            setData('last_used_number', e.target.value)
                        }
                        placeholder="0"
                    />
                    <InputError message={errors.last_used_number} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="deadline">Fecha Límite Emisión *</Label>
                    <Input
                        id="deadline"
                        type="date"
                        value={data.deadline}
                        onChange={(e) => setData('deadline', e.target.value)}
                    />
                    <InputError message={errors.deadline} />
                </div>
            </div>

            <div className="my-2 border-b border-muted"></div>
            <h3 className="text-sm font-semibold text-muted-foreground">
                Alertas y Notificaciones
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="limit_percentage_warning">
                        Alerta por porcentaje (%)
                    </Label>
                    <Input
                        id="limit_percentage_warning"
                        type="number"
                        value={data.limit_percentage_warning}
                        onChange={(e) =>
                            setData('limit_percentage_warning', e.target.value)
                        }
                        placeholder="10"
                        min="0"
                        max="100"
                    />
                    <InputError message={errors.limit_percentage_warning} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="limit_days_warning">
                        Alerta por días restantes
                    </Label>
                    <Input
                        id="limit_days_warning"
                        type="number"
                        value={data.limit_days_warning}
                        onChange={(e) =>
                            setData('limit_days_warning', e.target.value)
                        }
                        placeholder="15"
                        min="0"
                    />
                    <InputError message={errors.limit_days_warning} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="warning_notifications_amount">
                        Cantidad Notificaciones a Enviar
                    </Label>
                    <Input
                        id="warning_notifications_amount"
                        type="number"
                        value={data.warning_notifications_amount}
                        onChange={(e) =>
                            setData(
                                'warning_notifications_amount',
                                e.target.value,
                            )
                        }
                        placeholder="3"
                        min="0"
                    />
                    <InputError message={errors.warning_notifications_amount} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="warning_notifications_sent">
                        Notificaciones Enviadas
                    </Label>
                    <Input
                        id="warning_notifications_sent"
                        type="number"
                        value={data.warning_notifications_sent}
                        disabled
                        className="cursor-not-allowed bg-muted text-muted-foreground"
                    />
                    <InputError message={errors.warning_notifications_sent} />
                </div>
            </div>

            <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={processing}>
                    {caiRange?.id ? 'Actualizar Rango' : 'Guardar Rango'}
                </Button>
            </div>
        </form>
    );
}
