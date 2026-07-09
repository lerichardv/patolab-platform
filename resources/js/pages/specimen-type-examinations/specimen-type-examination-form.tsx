import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    store as storeExamination,
    update as updateExamination,
} from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
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
import { Textarea } from '../../components/ui/textarea';

interface SpecimenType {
    id: number;
    name: string;
}

interface Price {
    id?: number;
    amount: number | string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string | null;
    prices?: Price[];
}

interface Props {
    examination: Examination | null;
    specimenTypes: SpecimenType[];
    onSuccess: () => void;
    defaultSpecimenTypeId?: string;
}

export default function SpecimenTypeExaminationForm({
    examination,
    specimenTypes,
    onSuccess,
    defaultSpecimenTypeId,
}: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        specimen_type:
            examination?.specimen_type.toString() ||
            defaultSpecimenTypeId ||
            '',
        name: examination?.name || '',
        description: examination?.description || '',
        prices: examination?.prices || ([] as Price[]),
    });

    const [newPrice, setNewPrice] = useState<string>('');

    const handleAddPrice = () => {
        if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
            toast.error('Por favor, ingrese un precio válido.');

            return;
        }

        const priceAmount = parseFloat(newPrice).toFixed(2);

        setData('prices', [...data.prices, { amount: priceAmount }]);
        setNewPrice('');
    };

    const handlePriceChange = (index: number, value: string) => {
        const updatedPrices = [...data.prices];
        updatedPrices[index] = {
            ...updatedPrices[index],
            amount: value,
        };
        setData('prices', updatedPrices);
    };

    const handleRemovePrice = (index: number) => {
        const updatedPrices = data.prices.filter((_, i) => i !== index);
        setData('prices', updatedPrices);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (newPrice.trim() !== '') {
            toast.error(
                'Tiene un precio ingresado sin agregar. Por favor, haga clic en el botón "Agregar" para incluirlo en la lista o limpie el campo antes de continuar.',
            );

            return;
        }

        const options = {
            onSuccess: () => {
                toast.success(
                    examination
                        ? 'Tipo de análisis actualizado'
                        : 'Tipo de análisis creado',
                );
                onSuccess();
            },
        };

        if (examination) {
            put(updateExamination(examination.id).url, options);
        } else {
            post(storeExamination().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="specimen_type">Tipo de Muestra</Label>
                <Select
                    value={data.specimen_type}
                    onValueChange={(v) => setData('specimen_type', v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de muestra" />
                    </SelectTrigger>
                    <SelectContent>
                        {specimenTypes.map((type) => (
                            <SelectItem
                                key={type.id}
                                value={type.id.toString()}
                            >
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.specimen_type && (
                    <p className="text-sm text-destructive">
                        {errors.specimen_type}
                    </p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Análisis</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Estudio Histopatológico, Biopsia Simple..."
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción / Detalles <span className="text-muted-foreground font-normal text-xs">(Opcional)</span></Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descripción detallada del análisis (opcional)..."
                    className="resize-none"
                    rows={4}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">
                        {errors.description}
                    </p>
                )}
            </div>

            <div className="grid gap-3">
                <Label>Lista de Precios (L.)</Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute top-2.5 left-3 text-sm text-muted-foreground">
                            L.
                        </span>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="pl-7"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddPrice();
                                }
                            }}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddPrice}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Agregar
                    </Button>
                </div>

                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                    {data.prices.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            No se han agregado precios aún.
                        </p>
                    ) : (
                        data.prices.map((price, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="relative flex-1">
                                    <span className="absolute top-2 left-3 font-mono text-sm text-muted-foreground">
                                        L.
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price.amount}
                                        onChange={(e) =>
                                            handlePriceChange(
                                                idx,
                                                e.target.value,
                                            )
                                        }
                                        className="h-8 pl-7 font-mono"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive/90"
                                    onClick={() => handleRemovePrice(idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
                {errors.prices && (
                    <p className="text-sm text-destructive">{errors.prices}</p>
                )}
                {Object.keys(errors).some((key) =>
                    key.startsWith('prices.'),
                ) && (
                    <p className="text-sm text-destructive">
                        Por favor, revise que todos los precios sean válidos.
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {examination ? 'Guardar Cambios' : 'Crear Tipo de Análisis'}
                </Button>
            </div>
        </form>
    );
}
