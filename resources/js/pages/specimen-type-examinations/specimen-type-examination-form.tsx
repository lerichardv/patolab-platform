import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { 
    store as storeExamination, 
    update as updateExamination 
} from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '../../components/ui/textarea';

interface SpecimenType {
    id: number;
    name: string;
}

interface Examination {
    id: number;
    specimen_type: number;
    name: string;
    description: string;
}

interface Props {
    examination: Examination | null;
    specimenTypes: SpecimenType[];
    onSuccess: () => void;
    defaultSpecimenTypeId?: string;
}

export default function SpecimenTypeExaminationForm({ examination, specimenTypes, onSuccess, defaultSpecimenTypeId }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        specimen_type: examination?.specimen_type.toString() || defaultSpecimenTypeId || '',
        name: examination?.name || '',
        description: examination?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(examination ? 'Tipo de análisis actualizado' : 'Tipo de análisis creado');
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4 px-5">
            <div className="grid gap-2">
                <Label htmlFor="specimen_type">Tipo de Muestra</Label>
                <Select value={data.specimen_type} onValueChange={(v) => setData('specimen_type', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de muestra" />
                    </SelectTrigger>
                    <SelectContent>
                        {specimenTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.specimen_type && <p className="text-sm text-destructive">{errors.specimen_type}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Análisis</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. Estudio Histopatológico, Biopsia Simple..."
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción / Detalles</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descripción detallada del análisis..."
                    className="resize-none"
                    rows={4}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {examination ? 'Guardar Cambios' : 'Crear Tipo de Análisis'}
                </Button>
            </div>
        </form>
    );
}
