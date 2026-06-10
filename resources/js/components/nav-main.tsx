import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label,
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl, currentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const isAnyChildActive = (item: NavItem): boolean => {
        if (isCurrentUrl(item.href)) {
            return true;
        }

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

                    if (!hasSubItems) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                    className="sidebar-marquee-container"
                                >
                                    <Link
                                        href={item.href}
                                        prefetch
                                        onClick={handleLinkClick}
                                    >
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
                        <CollapsibleMenuItem
                            key={item.title}
                            item={item}
                            currentUrl={currentUrl}
                            isCurrentUrl={isCurrentUrl}
                            isAnyChildActive={isAnyChildActive}
                        />
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function CollapsibleMenuItem({
    item,
    currentUrl,
    isCurrentUrl,
    isAnyChildActive,
}: {
    item: NavItem;
    currentUrl: string;
    isCurrentUrl: (href: any) => boolean;
    isAnyChildActive: (item: NavItem) => boolean;
}) {
    const isActive = isAnyChildActive(item);
    const [isOpen, setIsOpen] = useState(isActive);
    const { isMobile, setOpenMobile } = useSidebar();

    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    useEffect(() => {
        if (isActive) {
            setIsOpen(true);
        }
    }, [isActive, currentUrl]);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            asChild
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={item.title}
                        className="sidebar-marquee-container"
                    >
                        {item.icon && <item.icon />}
                        <span className="sidebar-marquee-content truncate">
                            {item.title}
                        </span>
                        <ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 border-l pr-0">
                        {item.items?.map((subItem) => {
                            const hasSubSubItems =
                                subItem.items && subItem.items.length > 0;

                            if (!hasSubSubItems) {
                                return (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isCurrentUrl(
                                                subItem.href,
                                            )}
                                        >
                                            <Link
                                                href={subItem.href}
                                                prefetch
                                                className="sidebar-marquee-container"
                                                onClick={handleLinkClick}
                                            >
                                                {subItem.icon && (
                                                    <subItem.icon />
                                                )}
                                                <span className="sidebar-marquee-content truncate">
                                                    {subItem.title}
                                                </span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                );
                            }

                            return (
                                <CollapsibleSubMenuItem
                                    key={subItem.title}
                                    subItem={subItem}
                                    currentUrl={currentUrl}
                                    isCurrentUrl={isCurrentUrl}
                                    isAnyChildActive={isAnyChildActive}
                                />
                            );
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

function CollapsibleSubMenuItem({
    subItem,
    currentUrl,
    isCurrentUrl,
    isAnyChildActive,
}: {
    subItem: NavItem;
    currentUrl: string;
    isCurrentUrl: (href: any) => boolean;
    isAnyChildActive: (item: NavItem) => boolean;
}) {
    const isSubActive = isAnyChildActive(subItem);
    const [isOpen, setIsOpen] = useState(isSubActive);
    const { isMobile, setOpenMobile } = useSidebar();

    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    useEffect(() => {
        if (isSubActive) {
            setIsOpen(true);
        }
    }, [isSubActive, currentUrl]);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            asChild
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
                    <SidebarMenuSub className="mr-0 border-l pr-0">
                        {subItem.items?.map((ssItem) => (
                            <SidebarMenuSubItem key={ssItem.title}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isCurrentUrl(ssItem.href)}
                                >
                                    <Link
                                        href={ssItem.href}
                                        prefetch
                                        className="sidebar-marquee-container"
                                        onClick={handleLinkClick}
                                    >
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
}
