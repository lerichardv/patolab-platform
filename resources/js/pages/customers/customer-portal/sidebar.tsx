import { Link, usePage } from '@inertiajs/react';
import {
    FileText,
    KeyRound,
    LogOut,
    User,
    Shield,
    Building2,
    UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { dashboard, logout } from '@/routes/customer-portal';
import { password, profile } from '@/routes/customer-portal/settings';

interface SidebarProps {
    className?: string;
    onItemClick?: () => void;
}

export default function CustomerPortalSidebar({
    className,
    onItemClick,
}: SidebarProps) {
    const { url, props } = usePage<any>();
    const customer = props.auth?.customer;

    const navItems = [
        {
            title: 'Mis Estudios y Reportes',
            href: dashboard().url,
            icon: FileText,
            active: url === '/portal' || url.startsWith('/portal/specimens'),
        },
        {
            title: 'Mi Perfil',
            href: profile().url,
            icon: User,
            active: url === '/portal/settings/profile',
        },
        {
            title: 'Cambiar Contraseña',
            href: password().url,
            icon: KeyRound,
            active: url === '/portal/settings/password',
        },
    ];

    return (
        <aside
            className={cn(
                'flex h-full w-64 flex-col justify-between border-r border-border/60 bg-card/60 p-4 backdrop-blur-md transition-all duration-200',
                className,
            )}
        >
            <div className="flex flex-col gap-6">
                {/* Brand / Logo */}
                <div className="flex items-center gap-3 px-2 pt-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <img
                            src="/images/patolab-isotipo.png"
                            alt="PatoLab"
                            className="h-18 w-18 object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-md font-semibold tracking-tight text-foreground">
                            PatoLab
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <Shield className="h-3 w-3 text-primary" />
                            Portal de Clientes
                        </span>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-1">
                    <p className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Menú Principal
                    </p>
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onItemClick}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    item.active
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Customer User Info & Logout */}
            <div className="flex flex-col gap-3 border-t border-border/40 pt-4">
                {customer && (
                    <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between">
                            <span
                                className="max-w-[130px] truncate text-xs font-semibold text-foreground"
                                title={customer.name}
                            >
                                {customer.name}
                            </span>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px] capitalize"
                            >
                                {customer.type === 'empresa' ? (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-2.5 w-2.5" />
                                        Empresa
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <UserCheck className="h-2.5 w-2.5" />
                                        Paciente
                                    </span>
                                )}
                            </Badge>
                        </div>
                        <span
                            className="truncate text-[11px] text-muted-foreground"
                            title={customer.email}
                        >
                            {customer.email}
                        </span>
                    </div>
                )}

                <Link
                    href={logout().url}
                    method="post"
                    as="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Cerrar Sesión</span>
                </Link>
            </div>
        </aside>
    );
}
