import { Link, usePage } from '@inertiajs/react';
import {
    Beaker,
    BookOpen,
    Contact,
    FolderGit2,
    LayoutGrid,
    Users,
    ShieldCheck,
    FlaskConical,
    Microscope,
    UserRound,
    Tag,
    MapPin,
    Hash,
    Warehouse,
    PackageSearch,
    Package,
    ClipboardList,
    History,
    Receipt,
    Settings,
} from 'lucide-react';
import { index as caiRangesIndex } from '@/actions/App/Http/Controllers/CaiRangeController';
import { index as creditsIndex } from '@/actions/App/Http/Controllers/CreditController';
import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as inventoriesIndex } from '@/actions/App/Http/Controllers/InventoryController';
import { index as inventoryMovementsIndex } from '@/actions/App/Http/Controllers/InventoryMovementController';
import { index as invoicesIndex } from '@/actions/App/Http/Controllers/InvoiceController';
import { index as locationsIndex } from '@/actions/App/Http/Controllers/LocationController';
import { index as myAssignmentsIndex } from '@/actions/App/Http/Controllers/MyAssignmentController';
import { index as productsIndex } from '@/actions/App/Http/Controllers/ProductController';
import { index as referrersIndex } from '@/actions/App/Http/Controllers/ReferrerController';
import { index as referrerTypesIndex } from '@/actions/App/Http/Controllers/ReferrerTypeController';
import { index as rentalsIndex } from '@/actions/App/Http/Controllers/RentalController';
import { index as rolesIndex } from '@/actions/App/Http/Controllers/RoleController';
import { index as sequencesIndex } from '@/actions/App/Http/Controllers/SequenceController';
import { index as settingsSystemIndex } from '@/actions/App/Http/Controllers/SettingController';
import { index as specimenCategoriesIndex } from '@/actions/App/Http/Controllers/SpecimenCategoryController';
import { index as specimensIndex } from '@/actions/App/Http/Controllers/SpecimenController';
import { index as specimenTypesIndex } from '@/actions/App/Http/Controllers/SpecimenTypeController';
import { index as specimenTypeExaminationsIndex } from '@/actions/App/Http/Controllers/SpecimenTypeExaminationController';
import { index as specimenTypeTemplatesIndex } from '@/actions/App/Http/Controllers/SpecimenTypeTemplateController';
import { index as storagesIndex } from '@/actions/App/Http/Controllers/StorageController';
import { index as userCommissionsIndex } from '@/actions/App/Http/Controllers/UserCommissionController';
import { index as userCommissionRulesIndex } from '@/actions/App/Http/Controllers/UserCommissionRuleController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Resumen',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Facturación',
        href: invoicesIndex(),
        icon: Receipt,
        permission: 'invoices.view',
    },
    {
        title: 'Tablero de Muestras',
        href: specimensIndex(),
        icon: Microscope,
        permission: 'specimens.view',
    },
    {
        title: 'Mis Asignaciones',
        href: myAssignmentsIndex(),
        icon: ClipboardList,
        prefetch: false,
    },
    {
        title: 'Otros Cobros',
        href: rentalsIndex(),
        icon: Tag,
        permission: 'rentals.view',
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
                permission: 'inventory.view',
            },
            {
                title: 'Productos',
                href: productsIndex(),
                icon: Package,
                permission: 'products.view',
            },
            {
                title: 'Almacenes',
                href: storagesIndex(),
                icon: Warehouse,
                permission: 'storages.view',
            },
            {
                title: 'Historial de Movimientos',
                href: inventoryMovementsIndex(),
                icon: History,
                permission: 'inventory.movements.view',
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
                permission: 'patients.view',
            },
            {
                title: 'Muestras',
                href: '#',
                icon: Microscope,
                items: [
                    {
                        title: 'Tipos de Muestras',
                        href: specimenTypesIndex(),
                        permission: 'specimen_types.view',
                    },
                    {
                        title: 'Tipos de análisis',
                        href: specimenTypeExaminationsIndex(),
                        permission: 'specimen_type_examinations.view',
                    },
                    {
                        title: 'Categorías',
                        href: specimenCategoriesIndex(),
                        permission: 'specimen_categories.view',
                    },
                    {
                        title: 'Secuencias',
                        href: sequencesIndex(),
                        permission: 'sequences.view',
                    },
                    {
                        title: 'Plantillas',
                        href: specimenTypeTemplatesIndex(),
                        permission: 'specimen_type_templates.view',
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
                        permission: 'referrers.view',
                    },
                    {
                        title: 'Tipos de Remitentes',
                        href: referrerTypesIndex(),
                        permission: 'referrer_types.view',
                    },
                ],
            },
            {
                title: 'Contabilidad',
                href: '#',
                icon: Receipt,
                items: [
                    {
                        title: 'Rangos de Facturación',
                        href: caiRangesIndex(),
                        permission: 'cai_ranges.view',
                    },
                    {
                        title: 'Créditos',
                        href: creditsIndex(),
                        permission: ['credits.view', 'credits.manage'],
                    },
                ],
            },
            {
                title: 'Usuarios',
                href: '#',
                icon: Users,
                items: [
                    {
                        title: 'Lista de Usuarios',
                        href: usersIndex(),
                        permission: 'users.view',
                    },
                    {
                        title: 'Roles y Permisos',
                        href: rolesIndex(),
                        permission: 'roles.view',
                    },
                    {
                        title: 'Comisiones de usuarios',
                        href: userCommissionRulesIndex(),
                        permission: 'user_commission_rules.view',
                    },
                    {
                        title: 'Comisiones Otorgadas',
                        href: userCommissionsIndex(),
                        permission: 'user_commission_rules.view',
                    },
                ],
            },
            {
                title: 'Sucursales',
                href: locationsIndex(),
                icon: MapPin,
                permission: 'locations.view',
            },
            {
                title: 'Ajustes del Sistema',
                href: settingsSystemIndex(),
                icon: Settings,
                permission: 'settings.view',
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

function filterNavItems(
    items: NavItem[],
    userPermissions: string[] = [],
): NavItem[] {
    return items
        .map((item) => {
            const newItem = { ...item };

            if (newItem.items) {
                newItem.items = filterNavItems(newItem.items, userPermissions);
            }

            return newItem;
        })
        .filter((item) => {
            if (item.permission) {
                const requiredPermissions = Array.isArray(item.permission)
                    ? item.permission
                    : [item.permission];

                if (
                    !requiredPermissions.some((perm) =>
                        userPermissions.includes(perm),
                    )
                ) {
                    return false;
                }
            }

            if (item.items && item.items.length === 0 && item.href === '#') {
                return false;
            }

            return true;
        });
}

export function AppSidebar({
    collapsible = 'icon',
    variant = 'inset',
}: {
    collapsible?: 'offcanvas' | 'icon' | 'none';
    variant?: 'sidebar' | 'floating' | 'inset';
} = {}) {
    const { isMobile, setOpenMobile } = useSidebar();
    const { auth } = usePage<any>().props;
    const userPermissions = auth?.permissions || [];

    const filteredMain = filterNavItems(mainNavItems, userPermissions);
    const filteredAdmin = filterNavItems(adminNavItems, userPermissions);

    const handleLogoClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Sidebar collapsible={collapsible} variant={variant}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={dashboard()}
                                prefetch
                                onClick={handleLogoClick}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredMain} label="Operaciones" />
                <NavMain items={filteredAdmin} label="Gestión" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
