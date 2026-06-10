import { Head, useForm } from '@inertiajs/react';
import { Settings, Percent, Save } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { update as updateSettings } from '@/actions/App/Http/Controllers/SettingController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    settings: {
        third_age_discount: string;
        fourth_age_discount: string;
    };
}

export default function SystemSettingsIndex({ settings }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        third_age_discount: settings.third_age_discount || '30',
        fourth_age_discount: settings.fourth_age_discount || '40',
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(updateSettings().url, {
            onSuccess: () => {
                toast.success('Ajustes del sistema actualizados correctamente');
            },
            onError: (errs) => {
                toast.error('Ocurrió un error al actualizar los ajustes');
            },
        });
    };

    return (
        <>
            <Head title="Ajustes del Sistema" />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-2 border-b pb-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-inner">
                            <Settings className="h-6 w-6 animate-[spin_8s_linear_infinite]" />
                        </div>
                        <div>
                            <h1 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                                Ajustes del Sistema
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Configure los parámetros generales de la
                                plataforma y valores por defecto.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="overflow-hidden border border-muted bg-card/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <span className="flex h-2 w-2 rounded-full bg-primary" />
                                Descuentos de Pacientes
                            </CardTitle>
                            <CardDescription>
                                Establezca los porcentajes de descuento
                                automáticos aplicados en base a la edad de los
                                pacientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="group space-y-2">
                                    <Label
                                        htmlFor="third_age_discount"
                                        className="text-sm font-semibold transition-colors group-focus-within:text-primary"
                                    >
                                        Descuento Tercera Edad
                                    </Label>
                                    <div className="relative rounded-md shadow-sm transition-all duration-200">
                                        <Input
                                            id="third_age_discount"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="any"
                                            value={data.third_age_discount}
                                            onChange={(e) =>
                                                setData(
                                                    'third_age_discount',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-muted-foreground/20 pr-10 focus-visible:border-primary focus-visible:ring-primary"
                                            placeholder="30"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                            <Percent className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Se aplica automáticamente a los
                                        pacientes de la tercera edad.
                                    </p>
                                    <InputError
                                        message={errors.third_age_discount}
                                    />
                                </div>

                                <div className="group space-y-2">
                                    <Label
                                        htmlFor="fourth_age_discount"
                                        className="text-sm font-semibold transition-colors group-focus-within:text-primary"
                                    >
                                        Descuento Cuarta Edad
                                    </Label>
                                    <div className="relative rounded-md shadow-sm transition-all duration-200">
                                        <Input
                                            id="fourth_age_discount"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="any"
                                            value={data.fourth_age_discount}
                                            onChange={(e) =>
                                                setData(
                                                    'fourth_age_discount',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-muted-foreground/20 pr-10 focus-visible:border-primary focus-visible:ring-primary"
                                            placeholder="40"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                            <Percent className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Se aplica automáticamente a los
                                        pacientes de la cuarta edad.
                                    </p>
                                    <InputError
                                        message={errors.fourth_age_discount}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="flex h-10 w-full items-center gap-2 px-5 text-sm md:w-auto"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
