import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard, testPage } from '@/routes';
import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
import { index as specimenTypesIndex } from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { index as specimenTypeExaminationsIndex } from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
import { index as referrersIndex } from '@/actions/App/Http/Controllers/ReferrerController';
import { index as referrerTypesIndex } from '@/actions/App/Http/Controllers/ReferrerTypeController';
import { index as locationsIndex } from '@/actions/App/Http/Controllers/LocationController';
import { index as sequencesIndex } from '@/actions/App/Http/Controllers/SequenceController';
import { index as inventoriesIndex } from '@/actions/App/Http/Controllers/InventoryController';
import { index as productsIndex } from '@/actions/App/Http/Controllers/ProductController';
import { index as storagesIndex } from '@/actions/App/Http/Controllers/StorageController';
import { index as inventoryMovementsIndex } from '@/actions/App/Http/Controllers/InventoryMovementController';
import { Beaker, BookOpen, Contact, FolderGit2, LayoutGrid, Users, ShieldCheck, FlaskConical, Microscope, UserRound, Tag, MapPin, Hash, Warehouse, PackageSearch, Package, ClipboardList, History } from 'lucide-react';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Resumen',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Inventario',
        href: '#',
        icon: PackageSearch,
        items: [
            {
                title: 'Gestionar Inventario',
                href: inventoriesIndex(),
                icon: ClipboardList,
            },
            {
                title: 'Productos',
                href: productsIndex(),
                icon: Package,
            },
            {
                title: 'Almacenes',
                href: storagesIndex(),
                icon: Warehouse,
            },
            {
                title: 'Historial de Movimientos',
                href: inventoryMovementsIndex(),
                icon: History,
            },
        ],
    },
    {
        title: 'Administración',
        href: '#',
        icon: ShieldCheck,
        items: [
			{
				title: 'Clientes',
				href: customersIndex(),
				icon: Contact,
			},
            {
                title: 'Muestras',
                href: '#',
                icon: Microscope,
                items: [
                    {
                        title: 'Tipos de Muestras',
                        href: specimenTypesIndex(),
                    },
                    {
                        title: 'Tipos de análisis',
                        href: specimenTypeExaminationsIndex(),
                    },
                    {
                        title: 'Secuencias',
                        href: sequencesIndex(),
                    },
                ],
            },
            {
                title: 'Remitentes',
                href: '#',
                icon: UserRound,
                items: [
                    {
                        title: 'Gestionar Remitentes',
                        href: referrersIndex(),
                    },
                    {
                        title: 'Tipos de Remitentes',
                        href: referrerTypesIndex(),
                    },
                ],
            },
            {
                title: 'Sucursales',
                href: locationsIndex(),
                icon: MapPin,
            },
            {
                title: 'Usuarios del sistema',
                href: usersIndex(),
                icon: Users,
            },
        ],
    },
];

const footerNavItems: NavItem[] = [
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label="Operaciones" />
                <NavMain items={adminNavItems} label="Gestión" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
