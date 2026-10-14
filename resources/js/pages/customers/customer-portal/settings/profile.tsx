import { Head } from '@inertiajs/react';
import { Building2, Mail, MapPin, Phone, User, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface CustomerProfile {
    id: number;
    name: string;
    email: string;
    id_number: string;
    phone: string;
    secondary_phone?: string | null;
    type: 'cliente' | 'empresa';
    address?: string | null;
    formatted_age?: string | null;
    gender?: string | null;
    last_portal_login_at?: string | null;
}

interface Props {
    customer: CustomerProfile;
}

export default function CustomerPortalProfile({ customer }: Props) {
    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <Head title="Mi Perfil — Portal de Clientes" />

            <div className="flex flex-col gap-1">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                    <User className="h-5 w-5 text-primary" />
                    Mi Perfil
                </h1>
                <p className="text-xs text-muted-foreground">
                    Información registrada de su cuenta y datos de contacto en
                    PatoLab.
                </p>
            </div>

            <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <CardTitle className="text-base font-semibold">
                                    {customer.name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    ID / RTN: {customer.id_number}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {customer.type === 'empresa' ? (
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    Empresa / Clínica
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <UserCheck className="h-3 w-3" />
                                    Paciente Individual
                                </span>
                            )}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="font-medium text-muted-foreground">
                                    Correo Electrónico
                                </span>
                                <span className="font-semibold text-foreground">
                                    {customer.email}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                            <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="font-medium text-muted-foreground">
                                    Teléfono de Contacto
                                </span>
                                <span className="font-semibold text-foreground">
                                    {customer.phone || 'No registrado'}
                                </span>
                            </div>
                        </div>

                        {customer.secondary_phone && (
                            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="font-medium text-muted-foreground">
                                        Teléfono Secundario
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {customer.secondary_phone}
                                    </span>
                                </div>
                            </div>
                        )}

                        {customer.formatted_age && (
                            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="font-medium text-muted-foreground">
                                        Edad
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {customer.formatted_age}
                                    </span>
                                </div>
                            </div>
                        )}

                        {customer.gender && (
                            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="font-medium text-muted-foreground">
                                        Sexo
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {customer.gender}
                                    </span>
                                </div>
                            </div>
                        )}

                        {customer.address && (
                            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 md:col-span-2">
                                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="font-medium text-muted-foreground">
                                        Dirección Registrada
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {customer.address}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {customer.last_portal_login_at && (
                        <div className="border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                            Último acceso al portal registrado:{' '}
                            {customer.last_portal_login_at}
                        </div>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Nota: Para actualizar sus datos de identidad o dirección fiscal,
                por favor contacte al personal de PatoLab.
            </p>
        </div>
    );
}
