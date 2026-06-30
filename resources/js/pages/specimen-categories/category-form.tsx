import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    store as storeCategory,
    update as updateCategory,
} from '@/actions/App/Http/Controllers/SpecimenCategoryController';
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

interface Category {
    id: number;
    name: string;
    unit: string | null;
    quantity: number | null;
    intern_unit: string | null;
    intern_quantity: number | null;
}

interface Props {
    category: Category | null;
    onSuccess: () => void;
}

const UNIT_LABELS: Record<string, string> = {
    minutes: 'Minutos',
    hours: 'Horas',
    days: 'Días',
    weeks: 'Semanas',
};

export default function CategoryForm({ category, onSuccess }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: category?.name || '',
        quantity: category?.quantity || '',
        unit: category?.unit || 'minutes',
        intern_quantity: category?.intern_quantity ?? '',
        intern_unit: category?.intern_unit || 'days',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(
                    category ? 'Categoría actualizada' : 'Categoría creada',
                );
                onSuccess();
            },
        };

        if (category) {
            put(updateCategory(category.id).url, options);
        } else {
            post(storeCategory().url, options);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Rutina, Urgente..."
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="space-y-4">
                <div className="border-b pb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                        Tiempo de Entrega (Cliente)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Establece el tiempo de entrega prometido al cliente.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input
                            id="quantity"
                            type="number"
                            step="1"
                            min="0"
                            value={data.quantity}
                            onChange={(e) =>
                                setData('quantity', e.target.value)
                            }
                            placeholder="Ej. 24"
                        />
                        {errors.quantity && (
                            <p className="text-sm text-destructive">
                                {errors.quantity}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="unit">Unidad</Label>
                        <Select
                            value={data.unit}
                            onValueChange={(v) => setData('unit', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(UNIT_LABELS).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        {errors.unit && (
                            <p className="text-sm text-destructive">
                                {errors.unit}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="border-b pb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                        Tiempo de Entrega (Interno)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Establece el tiempo límite de procesamiento interno.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="intern_quantity">Cantidad</Label>
                        <Input
                            id="intern_quantity"
                            type="number"
                            step="1"
                            min="0"
                            value={data.intern_quantity}
                            onChange={(e) =>
                                setData('intern_quantity', e.target.value)
                            }
                            placeholder="Ej. 1"
                        />
                        {errors.intern_quantity && (
                            <p className="text-sm text-destructive">
                                {errors.intern_quantity}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="intern_unit">Unidad</Label>
                        <Select
                            value={data.intern_unit}
                            onValueChange={(v) => setData('intern_unit', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(UNIT_LABELS).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        {errors.intern_unit && (
                            <p className="text-sm text-destructive">
                                {errors.intern_unit}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full md:w-auto"
                >
                    {processing && <Spinner className="mr-2" />}
                    {category ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
            </div>
        </form>
    );
}
