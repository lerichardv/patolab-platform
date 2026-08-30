import { useForm, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    Plus,
    Upload,
    FileText,
    X,
    ExternalLink,
    AlertCircle,
    Tag,
    Microscope,
    Calendar,
    Edit2,
    Loader2,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuickEditMetadata } from './hooks/use-specimen-quick-edit-metadata';

interface Props {
    specimen: any;
    metadata: QuickEditMetadata | null;
    onSuccess: () => void;
    setIsDirty?: (dirty: boolean) => void;
}

function FormCombobox({
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
}: {
    options: {
        label: string;
        value: string;
        color?: string;
        disabled?: boolean;
    }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyMessage?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild className="w-full">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.color && (
                            <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: selectedOption.color,
                                }}
                            />
                        )}
                        <span className="truncate">
                            {selectedOption
                                ? selectedOption.label
                                : placeholder}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
            >
                <Command>
                    <CommandInput
                        placeholder={`Buscar ${placeholder.toLowerCase()}...`}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    disabled={option.disabled}
                                    onSelect={() => {
                                        if (option.disabled) {
                                            return;
                                        }

                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    {option.color && (
                                        <div
                                            className="mr-2 h-3 w-3 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: option.color,
                                            }}
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            'truncate',
                                            option.disabled &&
                                                'text-muted-foreground opacity-50',
                                        )}
                                    >
                                        {option.label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function SpecimenQuickEditForm({
    specimen,
    metadata,
    onSuccess,
    setIsDirty,
}: Props) {
    const { props: pageProps } = usePage<any>();
    const canManageInvoices =
        pageProps.auth?.permissions?.includes('invoices.manage');

    const { data, setData, post, processing, errors, isDirty } = useForm({
        referrer: specimen?.referrer ? specimen.referrer.toString() : '',
        specimen_category: specimen?.specimen_category
            ? specimen.specimen_category.toString()
            : '',
        priority_id: specimen?.priority_id
            ? specimen.priority_id.toString()
            : '',
        sample_collection_date: specimen?.sample_collection_date
            ? specimen.sample_collection_date.split('T')[0]
            : new Date().toISOString().split('T')[0],
        status: specimen?.status || 'received',
        medical_order_file: null as File | null,
        diagnosis: specimen?.diagnosis || '',
        anatomic_site: specimen?.anatomic_site || '',
        clinical_notes: specimen?.clinical_notes || '',
    });

    useEffect(() => {
        setIsDirty?.(isDirty);
    }, [isDirty, setIsDirty]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Standard Laravel Inertia POST to specimens/{specimen}/quick-update
        // with custom method spoofing since we are uploading files.
        post(`/specimens/${specimen.id}/quick-update`, {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Muestra actualizada con éxito');
                onSuccess();
            },
            onError: (errs) => {
                toast.error('Error al actualizar la muestra');
                console.error(errs);
            },
        });
    };

    const getInvoicesPageUrl = () => {
        return `/invoices?search=${encodeURIComponent(specimen.sequence_code || '')}&edit_specimen=${encodeURIComponent(specimen.sequence_code || '')}`;
    };

    const showReadOnlyNotification = () => {
        toast.info(
            'El cliente, el tipo de muestra, los exámenes y el método de pago no se pueden editar desde aquí porque su modificación afecta los cálculos de facturación. Para cambiar estos datos, use la opción de editar muestra en la sección de Facturas.',
        );
    };

    return (
        <form onSubmit={handleSubmit} className="mb-12 space-y-6 px-5">
            {/* INLINE WARNING BANNER */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="text-xs">
                    <p className="font-semibold">
                        Información de Facturación Protegida
                    </p>
                    <p className="mt-1 opacity-90">
                        Los campos como Cliente, Tipo de Muestra, Exámenes y
                        Método de Pago están protegidos de edición directa para
                        mantener la consistencia contable. Si necesita
                        cambiarlos, puede hacer clic en{' '}
                        <strong>"Editar en Facturas"</strong> para realizar los
                        cambios con recálculo automático de la factura.
                    </p>
                </div>
            </div>

            {/* CLIENT SELECTION AREA (Read-Only) */}
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Cliente
                    </span>
                    {canManageInvoices && (
                        <a
                            href={getInvoicesPageUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={showReadOnlyNotification}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" /> Editar en
                            Facturas
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                        {specimen.customer_relation?.name ||
                            specimen.customerRelation?.name ||
                            specimen.customer?.name ||
                            'Sin cliente'}
                    </span>
                    {(specimen.customer_relation ||
                        specimen.customerRelation) && (
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                (specimen.customer_relation?.type ||
                                    specimen.customerRelation?.type) ===
                                    'empresa'
                                    ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            )}
                        >
                            {(specimen.customer_relation?.type ||
                                specimen.customerRelation?.type) === 'empresa'
                                ? 'Empresa'
                                : 'Individual'}
                        </span>
                    )}
                </div>
            </div>

            {/* DATOS DE LA MUESTRA */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Datos de la Muestra
                </h3>

                {specimen?.sequence_code && (
                    <div className="flex items-center justify-between rounded-md border border-dashed bg-muted/40 p-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Tag className="h-3.5 w-3.5" /> Código de Secuencia
                            (Muestra):
                        </span>
                        <span className="font-mono text-sm font-bold text-primary">
                            {specimen.sequence_code}
                        </span>
                    </div>
                )}

                {/* Remitente (Médico) */}
                <div className="grid gap-2">
                    <Label htmlFor="referrer">Remitente (Médico)</Label>
                    <FormCombobox
                        placeholder="Seleccionar médico"
                        value={data.referrer}
                        onChange={(v) => setData('referrer', v)}
                        options={(metadata?.referrers || []).map((r) => ({
                            label:
                                r.notes && r.notes.trim()
                                    ? `(ID: ${r.id}) ${r.name} - ${r.notes.trim()}`
                                    : `(ID: ${r.id}) ${r.name} - (Sin Notas/Hospital/Clinica)`,
                            value: r.id.toString(),
                        }))}
                    />
                    {errors.referrer && (
                        <p className="text-xs text-destructive">
                            {errors.referrer}
                        </p>
                    )}
                </div>

                {/* Tipo de Muestra & Examenes (Read-Only) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Tipo de Muestra
                            </span>
                            {canManageInvoices && (
                                <a
                                    href={getInvoicesPageUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={showReadOnlyNotification}
                                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" /> Editar
                                    en Facturas
                                </a>
                            )}
                        </div>
                        <span className="font-semibold text-foreground">
                            {specimen.type?.name ||
                                specimen.specimen_type_name ||
                                'Sin tipo'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Examen(es) a Realizar
                            </span>
                            {canManageInvoices && (
                                <a
                                    href={getInvoicesPageUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={showReadOnlyNotification}
                                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" /> Editar
                                    en Facturas
                                </a>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {specimen.examinations &&
                            specimen.examinations.length > 0 ? (
                                specimen.examinations.map((exam: any) => (
                                    <Badge
                                        key={exam.id}
                                        variant="outline"
                                        className="bg-background"
                                    >
                                        {exam.name}
                                    </Badge>
                                ))
                            ) : (
                                <span className="font-semibold text-foreground">
                                    {specimen.examination?.name || 'Sin examen'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Categoría & Prioridad */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="specimen_category">
                            Categoría (Tiempo)
                        </Label>
                        <Select
                            value={data.specimen_category}
                            onValueChange={(val) =>
                                setData('specimen_category', val)
                            }
                        >
                            <SelectTrigger
                                id="specimen_category"
                                className="w-full"
                            >
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {(metadata?.categories || []).map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id.toString()}
                                    >
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.specimen_category && (
                            <p className="text-xs text-destructive">
                                {errors.specimen_category}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority_id">Prioridad</Label>
                        <Select
                            value={data.priority_id}
                            onValueChange={(val) => setData('priority_id', val)}
                        >
                            <SelectTrigger id="priority_id" className="w-full">
                                <SelectValue placeholder="Seleccionar prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                                {(metadata?.priorities || []).map((p) => (
                                    <SelectItem
                                        key={p.id}
                                        value={p.id.toString()}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{
                                                    backgroundColor: p.color,
                                                }}
                                            />
                                            {p.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.priority_id && (
                            <p className="text-xs text-destructive">
                                {errors.priority_id}
                            </p>
                        )}
                    </div>
                </div>

                {/* Fecha de la toma & Estado */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="sample_collection_date">
                            Fecha de la toma
                        </Label>
                        <DatePicker
                            value={data.sample_collection_date}
                            className="w-full"
                            onChange={(dateString) =>
                                setData('sample_collection_date', dateString)
                            }
                        />
                        {errors.sample_collection_date && (
                            <p className="text-xs text-destructive">
                                {errors.sample_collection_date}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status">Estado Inicial / Actual</Label>
                        <Select
                            value={data.status}
                            onValueChange={(val) => setData('status', val)}
                        >
                            <SelectTrigger id="status" className="w-full">
                                <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="received">
                                    Recibido
                                </SelectItem>
                                <SelectItem value="macroscopic_review">
                                    Revisión Macroscópica
                                </SelectItem>
                                <SelectItem value="processing">
                                    Procesamiento
                                </SelectItem>
                                <SelectItem value="microscopic_review">
                                    Revisión Microscópica
                                </SelectItem>
                                <SelectItem value="finalized">
                                    Finalizado
                                </SelectItem>
                                <SelectItem value="delivered">
                                    Entregado
                                </SelectItem>
                                <SelectItem value="cancelled">
                                    Cancelado
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status && (
                            <p className="text-xs text-destructive">
                                {errors.status}
                            </p>
                        )}
                    </div>
                </div>

                {/* Orden Médica File Upload */}
                <div className="grid gap-2">
                    <Label htmlFor="medical_order_file">
                        Orden Médica (Archivo PDF o Imagen)
                    </Label>

                    {specimen?.medical_order_file &&
                        !data.medical_order_file && (
                            <div className="flex items-center justify-between rounded-lg border border-muted bg-muted/40 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-foreground">
                                            Archivo de Orden Médica existente
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Ya hay un archivo subido
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/storage/${specimen.medical_order_file}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />{' '}
                                        Ver / Descargar
                                    </a>
                                </div>
                            </div>
                        )}

                    {data.medical_order_file && (
                        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="max-w-[200px] truncate text-xs font-semibold text-foreground sm:max-w-xs">
                                        {data.medical_order_file.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {(
                                            data.medical_order_file.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{' '}
                                        MB
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setData('medical_order_file', null)
                                }
                                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {!data.medical_order_file && (
                        <div className="group relative">
                            <input
                                type="file"
                                id="medical_order_file"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;

                                    if (file && file.size > 50 * 1024 * 1024) {
                                        toast.error(
                                            'El archivo de Orden Médica no debe exceder los 50MB.',
                                        );
                                        e.target.value = '';

                                        return;
                                    }

                                    setData('medical_order_file', file);
                                }}
                            />
                            <label
                                htmlFor="medical_order_file"
                                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-accent/10"
                            >
                                <div className="mb-2 rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-200 group-hover:scale-110">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">
                                    {specimen?.medical_order_file
                                        ? 'Reemplazar archivo de Orden Médica'
                                        : 'Subir Orden Médica'}
                                </span>
                                <span className="mt-1 text-[10px] text-muted-foreground">
                                    PDF o imágenes hasta 50MB
                                </span>
                            </label>
                        </div>
                    )}

                    {errors.medical_order_file && (
                        <p className="text-sm text-destructive">
                            {errors.medical_order_file}
                        </p>
                    )}
                </div>

                {/* Textareas */}
                <div className="grid gap-2">
                    <Label htmlFor="diagnosis">
                        Diagnóstico Clínico / Sospecha
                    </Label>
                    <Textarea
                        id="diagnosis"
                        placeholder="Escriba el diagnóstico aquí..."
                        value={data.diagnosis}
                        onChange={(e) => setData('diagnosis', e.target.value)}
                        rows={3}
                    />
                    {errors.diagnosis && (
                        <p className="text-xs text-destructive">
                            {errors.diagnosis}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="anatomic_site">Sitio Anatómico</Label>
                    <Textarea
                        id="anatomic_site"
                        placeholder="Ej. Brazo izquierdo..."
                        value={data.anatomic_site}
                        onChange={(e) =>
                            setData('anatomic_site', e.target.value)
                        }
                        rows={2}
                    />
                    {errors.anatomic_site && (
                        <p className="text-xs text-destructive">
                            {errors.anatomic_site}
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="clinical_notes">Notas Clínicas</Label>
                    <Textarea
                        id="clinical_notes"
                        placeholder="Información adicional relevante..."
                        value={data.clinical_notes}
                        onChange={(e) =>
                            setData('clinical_notes', e.target.value)
                        }
                        rows={3}
                    />
                    {errors.clinical_notes && (
                        <p className="text-xs text-destructive">
                            {errors.clinical_notes}
                        </p>
                    )}
                </div>
            </div>

            {/* INFORMACIÓN DE FACTURACIÓN (Read-Only) */}
            <div className="border-t pt-4">
                <h4 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Información de Facturación
                </h4>
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                            Método de pago:
                        </span>
                        {canManageInvoices && (
                            <a
                                href={getInvoicesPageUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={showReadOnlyNotification}
                                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                            >
                                <ExternalLink className="h-3 w-3" /> Editar en
                                Facturas
                            </a>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 pt-2 text-xs">
                        <div>
                            <span className="text-muted-foreground">
                                Tipo de Pago:{' '}
                            </span>
                            <span className="font-semibold text-foreground capitalize">
                                {specimen.invoice_relation?.payment_type ===
                                'credit'
                                    ? 'Al Crédito'
                                    : specimen.invoice_relation?.payment_type ||
                                      specimen.group?.invoice?.payment_type ||
                                      'Desconocido'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Fecha Factura:{' '}
                            </span>
                            <span className="font-semibold text-foreground">
                                {specimen.invoice_relation?.created_at
                                    ? new Date(
                                          specimen.invoice_relation.created_at,
                                      ).toLocaleDateString()
                                    : specimen.group?.invoice?.created_at
                                      ? new Date(
                                            specimen.group.invoice.created_at,
                                        ).toLocaleDateString()
                                      : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GUARDAR CAMBIOS BUTTON */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
                <Button type="submit" disabled={processing} className="px-6">
                    {processing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                            Guardando...
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </Button>
            </div>
        </form>
    );
}
