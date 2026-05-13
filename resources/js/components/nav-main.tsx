import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';
export function NavMain({ items = [], label }: { items: NavItem[]; label?: string }) {
    const { isCurrentUrl } = useCurrentUrl();

    const isAnyChildActive = (item: NavItem): boolean => {
        if (isCurrentUrl(item.href)) return true;
        if (item.items) {
            return item.items.some((sub) => isAnyChildActive(sub));
        }
        return false;
    };

    return (
        <SidebarGroup className="px-2 py-0">
            {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
            <SidebarMenu>
                {items.map((item) => {
                    const hasSubItems = item.items && item.items.length > 0;
                    const isActive = isAnyChildActive(item);

                    if (!hasSubItems) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                    className="sidebar-marquee-container"
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span className="sidebar-marquee-content truncate">
                                            {item.title}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={isActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title} className="sidebar-marquee-container">
                                        {item.icon && <item.icon />}
                                        <span className="sidebar-marquee-content truncate">
                                            {item.title}
                                        </span>
                                        <ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="mr-0 pr-0 border-l">
                                        {item.items?.map((subItem) => {
                                            const hasSubSubItems = subItem.items && subItem.items.length > 0;
                                            const isSubActive = isAnyChildActive(subItem);

                                            if (!hasSubSubItems) {
                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild isActive={isCurrentUrl(subItem.href)}>
                                                            <Link href={subItem.href} prefetch className="sidebar-marquee-container">
                                                                {subItem.icon && <subItem.icon />}
                                                                <span className="sidebar-marquee-content truncate">
                                                                    {subItem.title}
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            }

                                            return (
                                                <Collapsible
                                                    key={subItem.title}
                                                    asChild
                                                    defaultOpen={isSubActive}
                                                    className="group/sub-collapsible"
                                                >
                                                    <SidebarMenuSubItem>
                                                        <CollapsibleTrigger asChild>
                                                            <SidebarMenuSubButton className="sidebar-marquee-container">
                                                                {subItem.icon && <subItem.icon />}
                                                                <span className="sidebar-marquee-content truncate">
                                                                    {subItem.title}
                                                                </span>
                                                                <ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                                            </SidebarMenuSubButton>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <SidebarMenuSub className="mr-0 pr-0 border-l">
                                                                {subItem.items?.map((ssItem) => (
                                                                    <SidebarMenuSubItem key={ssItem.title}>
                                                                        <SidebarMenuSubButton asChild isActive={isCurrentUrl(ssItem.href)}>
                                                                            <Link href={ssItem.href} prefetch className="sidebar-marquee-container">
                                                                                <span className="sidebar-marquee-content truncate">
                                                                                    {ssItem.title}
                                                                                </span>
                                                                            </Link>
                                                                        </SidebarMenuSubButton>
                                                                    </SidebarMenuSubItem>
                                                                ))}
                                                            </SidebarMenuSub>
                                                        </CollapsibleContent>
                                                    </SidebarMenuSubItem>
                                                </Collapsible>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
