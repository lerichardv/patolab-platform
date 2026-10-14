import { Link, usePage } from '@inertiajs/react';
import { Menu, Moon, Sun, User, LogOut } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes/customer-portal';
import { password, profile } from '@/routes/customer-portal/settings';
import CustomerPortalSidebar from './sidebar';

export default function CustomerPortalLayout({ children }: PropsWithChildren) {
    const { props } = usePage<any>();
    const customer = props.auth?.customer;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground antialiased">
            {/* Desktop Sidebar */}
            <div className="hidden shrink-0 lg:block">
                <div className="sticky top-0 h-screen">
                    <CustomerPortalSidebar />
                </div>
            </div>

            {/* Mobile Sheet Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-72 p-0">
                    <CustomerPortalSidebar
                        onItemClick={() => setMobileOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-8">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Abrir menú"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold tracking-tight text-foreground md:text-base">
                                Portal de Pacientes y Clientes
                            </span>
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                                PatoLab — Laboratorio de Patología
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            title="Cambiar tema"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {resolvedAppearance === 'dark' ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>

                        {/* Customer User Dropdown */}
                        {customer && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2 border-border/60 bg-card/60"
                                    >
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                            {customer.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || 'C'}
                                        </div>
                                        <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
                                            {customer.name}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="truncate text-sm leading-none font-medium">
                                                {customer.name}
                                            </p>
                                            <p className="truncate text-xs leading-none text-muted-foreground">
                                                {customer.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={profile().url}
                                            className="cursor-pointer"
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Mi Perfil</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={password().url}
                                            className="cursor-pointer"
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Cambiar Contraseña</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        asChild
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Link
                                            href={logout().url}
                                            method="post"
                                            as="button"
                                            className="flex w-full cursor-pointer items-center"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Cerrar Sesión</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </header>

                {/* Page Main Content */}
                <main className="flex-1 p-4 md:p-8">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
