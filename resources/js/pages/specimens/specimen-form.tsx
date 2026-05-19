import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CustomerForm from '../customers/customer-form';
import { 
    store as storeSpecimen, 
    update as updateSpecimen 
} from '@/actions/App/Http/Controllers/SpecimenController';

interface Props {
    specimen: any | null;
    onSuccess: () => void;
    customers: any[];
    specimenTypes: any[];
    examinations: any[];
    categories: any[];
    referrers: any[];
    priorities: any[];
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.'
}: {
    options: { label: string; value: string; color?: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.color && (
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
                        )}
                        <span className="truncate">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.color && (
                                        <div className="mr-2 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                                    )}
                                    <span className="truncate">{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function SpecimenForm({ 
    specimen, 
    onSuccess, 
    customers, 
    specimenTypes, 
    examinations, 
    categories, 
    referrers, 
    priorities 
}: Props) {
    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = React.useState(false);
    const { data, setData, post, put, processing, errors } = useForm({
        customer: specimen?.customer ? specimen.customer.toString() : '',
        specimen_type: specimen?.specimen_type ? specimen.specimen_type.toString() : '',
        specimen_type_examination: specimen?.specimen_type_examination ? specimen.specimen_type_examination.toString() : '',
        specimen_category: specimen?.specimen_category ? specimen.specimen_category.toString() : '',
        referrer: specimen?.referrer ? specimen.referrer.toString() : '',
        anatomic_site: specimen?.anatomic_site || '',
        diagnosis: specimen?.diagnosis || '',
        clinical_notes: specimen?.clinical_notes || '',
        status: specimen?.status || 'received',
        priority_id: specimen?.priority_id ? specimen.priority_id.toString() : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                toast.success(specimen ? 'Muestra actualizada' : 'Muestra creada');
                onSuccess();
            },
        };

        if (specimen) {
            put(updateSpecimen(specimen.id).url, options);
        } else {
            post(storeSpecimen().url, options);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4 px-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="customer">Cliente / Paciente</Label>
                            <button 
                                type="button" 
                                onClick={() => setIsCustomerSheetOpen(true)}
                                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Nuevo
                            </button>
                        </div>
                    <FormCombobox
                        placeholder="Seleccionar cliente"
                        value={data.customer}
                        onChange={(v) => setData('customer', v)}
                        options={customers.map(c => ({ label: c.name, value: c.id.toString() }))}
                    />
                    {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="referrer">Remitente (Médico)</Label>
                    <FormCombobox
                        placeholder="Seleccionar médico"
                        value={data.referrer}
                        onChange={(v) => setData('referrer', v)}
                        options={referrers.map(r => ({ label: r.name, value: r.id.toString() }))}
                    />
                    {errors.referrer && <p className="text-sm text-destructive">{errors.referrer}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="specimen_type">Tipo de Muestra</Label>
                    <FormCombobox
                        placeholder="Seleccionar tipo"
                        value={data.specimen_type}
                        onChange={(v) => setData('specimen_type', v)}
                        options={specimenTypes.map(t => ({ label: t.name, value: t.id.toString() }))}
                    />
                    {errors.specimen_type && <p className="text-sm text-destructive">{errors.specimen_type}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="specimen_type_examination">Examen a Realizar</Label>
                    <FormCombobox
                        placeholder="Seleccionar examen"
                        value={data.specimen_type_examination}
                        onChange={(v) => setData('specimen_type_examination', v)}
                        options={examinations.map(e => ({ label: e.name, value: e.id.toString() }))}
                    />
                    {errors.specimen_type_examination && <p className="text-sm text-destructive">{errors.specimen_type_examination}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="specimen_category">Categoría (Tiempo)</Label>
                    <FormCombobox
                        placeholder="Seleccionar categoría"
                        value={data.specimen_category}
                        onChange={(v) => setData('specimen_category', v)}
                        options={categories.map(c => ({ label: c.name, value: c.id.toString() }))}
                    />
                    {errors.specimen_category && <p className="text-sm text-destructive">{errors.specimen_category}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="priority_id">Prioridad</Label>
                    <FormCombobox
                        placeholder="Seleccionar prioridad"
                        value={data.priority_id}
                        onChange={(v) => setData('priority_id', v)}
                        options={priorities.map(p => ({ label: p.name, value: p.id.toString(), color: p.color }))}
                    />
                    {errors.priority_id && <p className="text-sm text-destructive">{errors.priority_id}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="anatomic_site">Sitio Anatómico</Label>
                    <Input
                        id="anatomic_site"
                        value={data.anatomic_site}
                        onChange={(e) => setData('anatomic_site', e.target.value)}
                        placeholder="Ej. Brazo izquierdo..."
                    />
                    {errors.anatomic_site && <p className="text-sm text-destructive">{errors.anatomic_site}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="status">Estado Inicial / Actual</Label>
                    <FormCombobox
                        placeholder="Seleccionar estado"
                        value={data.status}
                        onChange={(v) => setData('status', v)}
                        options={[
                            { label: 'Recibida', value: 'received', color: '#3b82f6' },
                            { label: 'Revisión Macroscópica', value: 'macroscopic_review', color: '#8b5cf6' },
                            { label: 'En Proceso', value: 'processing', color: '#f59e0b' },
                            { label: 'Revisión Microscópica', value: 'microscopic_review', color: '#d946ef' },
                            { label: 'Analizada / Finalizada', value: 'finalized', color: '#10b981' },
                            { label: 'Entregada', value: 'delivered', color: '#64748b' },
                            { label: 'Cancelada', value: 'cancelled', color: '#ef4444' },
                        ]}
                    />
                    {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="diagnosis">Diagnóstico Clínico / Sospecha</Label>
                <Textarea
                    id="diagnosis"
                    value={data.diagnosis}
                    onChange={(e) => setData('diagnosis', e.target.value)}
                    placeholder="Escriba el diagnóstico aquí..."
                    className="resize-none"
                    rows={3}
                />
                {errors.diagnosis && <p className="text-sm text-destructive">{errors.diagnosis}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="clinical_notes">Notas Clínicas</Label>
                <Textarea
                    id="clinical_notes"
                    value={data.clinical_notes}
                    onChange={(e) => setData('clinical_notes', e.target.value)}
                    placeholder="Información adicional relevante..."
                    className="resize-none"
                    rows={3}
                />
                {errors.clinical_notes && <p className="text-sm text-destructive">{errors.clinical_notes}</p>}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
                {specimen && specimen.created_at ? (
                    <div className="text-sm text-muted-foreground">
                        Creada el: {new Date(specimen.created_at).toLocaleString('es-ES', {
                            dateStyle: 'long',
                            timeStyle: 'short'
                        })}
                    </div>
                ) : (
                    <div />
                )}
                <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                    {processing && <Spinner className="mr-2" />}
                    {specimen ? 'Guardar Cambios' : 'Crear Muestra'}
                </Button>
            </div>
        </form>

        <Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Nuevo Cliente / Paciente</SheetTitle>
                </SheetHeader>
                <div className="mt-4 -mx-5 px-5">
                    <CustomerForm onSuccess={() => setIsCustomerSheetOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
        </>
    );
}
