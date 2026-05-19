import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
    store as storeCategory, 
    update as updateCategory 
} from '@/actions/App/Http/Controllers/SpecimenCategoryController';

interface Category {
    id: number;
    name: string;
    unit: string;
    quantity: number;
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
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(category ? 'Categoría actualizada' : 'Categoría creada');
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4 px-5">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Rutina, Urgente..."
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="quantity">Cantidad (Tiempo)</Label>
                    <Input
                        id="quantity"
                        type="number"
                        step="1"
                        min="0"
                        value={data.quantity}
                        onChange={(e) => setData('quantity', e.target.value)}
                        placeholder="Ej. 24"
                    />
                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Select value={data.unit} onValueChange={(v) => setData('unit', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(UNIT_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.unit && <p className="text-sm text-destructive">{errors.unit}</p>}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {category ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
            </div>
        </form>
    );
}
