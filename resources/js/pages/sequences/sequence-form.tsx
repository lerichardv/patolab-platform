import { useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
    store as storeSequence,
    update as updateSequence,
} from '@/actions/App/Http/Controllers/SequenceController';
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

interface SpecimenType {
    id: number;
    name: string;
}

interface Sequence {
    id?: number;
    location_id: number;
    specimen_type: number;
    prefix: string;
    separator: string;
    fill: number;
    month: number;
    year: number;
    current_sequence: number;
}

interface Props {
    sequence?: Sequence;
    locations: Location[];
    specimenTypes: SpecimenType[];
    sequences?: any[];
    onSuccess: () => void;
    defaultLocationId?: number;
    defaultSpecimenTypeId?: number;
}

export default function SequenceForm({
    sequence,
    locations,
    specimenTypes,
    sequences = [],
    onSuccess,
    defaultLocationId,
    defaultSpecimenTypeId,
}: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        location_id:
            sequence?.location_id ||
            defaultLocationId ||
            (locations.length > 0 ? locations[0].id : 0),
        specimen_type:
            sequence?.specimen_type ||
            defaultSpecimenTypeId ||
            (specimenTypes.length > 0 ? specimenTypes[0].id : 0),
        prefix: sequence?.prefix || '',
        separator: sequence?.separator || '-',
        fill: sequence?.fill || 4,
        month: sequence?.month || new Date().getMonth() + 1,
        year: sequence?.year || new Date().getFullYear(),
        current_sequence: sequence?.current_sequence || 1,
    });

    const hasSequence = (specimenTypeId: number) => {
        return sequences.some(
            (s) =>
                s.location_id === data.location_id &&
                s.specimen_type === specimenTypeId &&
                s.id !== sequence?.id,
        );
    };

    useEffect(() => {
        if (sequence) {
            setData({
                location_id: sequence.location_id,
                specimen_type: sequence.specimen_type,
                prefix: sequence.prefix,
                separator: sequence.separator,
                fill: sequence.fill,
                month: sequence.month,
                year: sequence.year,
                current_sequence: sequence.current_sequence,
            });
        } else {
            setData({
                location_id:
                    defaultLocationId ||
                    (locations.length > 0 ? locations[0].id : 0),
                specimen_type:
                    defaultSpecimenTypeId ||
                    (specimenTypes.length > 0 ? specimenTypes[0].id : 0),
                prefix: '',
                separator: '-',
                fill: 4,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                current_sequence: 1,
            });
        }
    }, [sequence, defaultLocationId, defaultSpecimenTypeId]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (sequence?.id) {
            put(updateSequence(sequence.id).url, {
                preserveState: true,
                onSuccess: () => {
                    toast.success('Secuencia actualizada correctamente');
                    onSuccess();
                },
            });
        } else {
            post(storeSequence().url, {
                preserveState: true,
                onSuccess: () => {
                    toast.success('Secuencia creada correctamente');
                    onSuccess();
                    reset();
                },
            });
        }
    };

    const formatPreview = () => {
        const fill = data.fill || 4;
        const seq = String(data.current_sequence).padStart(fill, '0');
        const month = String(data.month).padStart(2, '0');
        const year = String(data.year);
        const prefix = data.prefix || '...';
        const separator = data.separator || '';

        return `${prefix}${separator}${seq}${separator}${month}${separator}${year}`;
    };

    return (
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/50 p-4">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Previsualización en tiempo real
                </span>
                <code className="font-mono text-xl font-bold tracking-tight text-primary">
                    {formatPreview()}
                </code>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="location_id">Sucursal *</Label>
                    <Select
                        value={data.location_id.toString()}
                        onValueChange={(value) =>
                            setData('location_id', parseInt(value))
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione sucursal" />
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
                    <Label htmlFor="specimen_type">Tipo de Muestra *</Label>
                    <Select
                        value={data.specimen_type.toString()}
                        onValueChange={(value) =>
                            setData('specimen_type', parseInt(value))
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {specimenTypes.map((type) => {
                                const exists = hasSequence(type.id);

                                return (
                                    <SelectItem
                                        key={type.id}
                                        value={type.id.toString()}
                                        disabled={exists}
                                        className={
                                            exists
                                                ? 'font-normal text-muted-foreground opacity-60'
                                                : ''
                                        }
                                    >
                                        {type.name}{' '}
                                        {exists ? ' (Ya configurado)' : ''}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.specimen_type} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="prefix">Prefijo *</Label>
                    <Input
                        id="prefix"
                        value={data.prefix}
                        onChange={(e) => setData('prefix', e.target.value)}
                        placeholder="Ej. BIO"
                    />
                    <InputError message={errors.prefix} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="separator">Separador *</Label>
                    <Input
                        id="separator"
                        value={data.separator}
                        onChange={(e) => setData('separator', e.target.value)}
                        placeholder="Ej. -"
                    />
                    <InputError message={errors.separator} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="fill">Ceros (Relleno) *</Label>
                <Input
                    id="fill"
                    type="number"
                    value={data.fill}
                    onChange={(e) => setData('fill', parseInt(e.target.value))}
                />
                <InputError message={errors.fill} />
            </div>

            <div className="rounded-lg border border-accent bg-accent/50 p-3 text-sm text-muted-foreground">
                <p>
                    <strong>Nota:</strong> El mes y el año se asignarán
                    automáticamente según la fecha actual al momento de generar
                    el número de secuencia para la muestra.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="current_sequence">Secuencia Actual *</Label>
                <Input
                    id="current_sequence"
                    type="number"
                    min="1"
                    value={data.current_sequence}
                    onChange={(e) =>
                        setData('current_sequence', parseInt(e.target.value))
                    }
                />
                <InputError message={errors.current_sequence} />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={processing}>
                    {sequence?.id
                        ? 'Actualizar Secuencia'
                        : 'Guardar Secuencia'}
                </Button>
            </div>
        </form>
    );
}
