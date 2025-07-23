import { cn } from '@/modules/shadcn/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/modules/shadcn/ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/modules/shadcn/ui/sidebar';
import { ChevronRight, LucideIcon } from 'lucide-react';
import * as React from 'react';
import { NavLink, useLocation } from 'react-router';

export interface SubMenuItem {
  title: string;
  href: string;
}

export interface MenuItem {
  title: string;
  icon?: LucideIcon;
  href?: string;
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
}

interface SidebarMenuProps {
  menuItems: MenuItem[];
  className?: string;
}

// Helper to normalize paths by removing trailing slashes
const normalizePath = (path: string) => path.replace(/\/+$/, '');

export function SidebarMenuComponent({ menuItems, className }: SidebarMenuProps) {
  const location = useLocation();

  // Memoize normalized pathname to avoid recalculation
  const normalizedPathname = React.useMemo(
    () => normalizePath(location.pathname),
    [location.pathname]
  );

  // Memoize normalized hrefs for all menu items
  const normalizedHrefs = React.useMemo(() => {
    const hrefs = new Map<MenuItem, string>();
    menuItems.forEach((item) => {
      if (item.href) {
        hrefs.set(item, normalizePath(item.href));
      }
    });
    return hrefs;
  }, [menuItems]);

  // Memoize the most specific active item to avoid recalculating for each item
  const mostSpecificActiveItem = React.useMemo(() => {
    let mostSpecificItem: MenuItem | null = null;
    let maxLength = 0;

    for (const item of menuItems) {
      if (!item.href) continue;

      const normalizedHref = normalizedHrefs.get(item)!;
      const isActive =
        normalizedPathname === normalizedHref ||
        normalizedPathname.startsWith(normalizedHref + '/');

      if (isActive && normalizedHref.length > maxLength) {
        maxLength = normalizedHref.length;
        mostSpecificItem = item;
      }
    }

    return mostSpecificItem;
  }, [menuItems, normalizedHrefs, normalizedPathname]);

  const isMenuItemActive = (
    href: string | undefined,
    checkSpecificity: boolean = false,
    currentItem?: MenuItem
  ) => {
    if (href === undefined) return false;

    const normalizedHref = normalizePath(href);
    const isActive =
      normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + '/');

    // If we don't need to check specificity (for submenu items), return early
    if (!checkSpecificity || !currentItem) {
      return isActive;
    }

    // For main menu items, check if this is the most specific active item
    return mostSpecificActiveItem === currentItem;
  };

  return (
    <div data-slot="sidebar-container" className={cn('p-2', className)}>
      <SidebarGroup>
        {menuItems.map((item, index) => (
          <SidebarMenu key={index}>
            {item.hasSubmenu ? (
              <Collapsible
                asChild
                defaultOpen={item.submenuItems?.some((subItem) => isMenuItemActive(subItem.href))}
                className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="hover:bg-accent">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.submenuItems?.map((subItem, subIndex) => (
                        <SidebarMenuSubItem key={subIndex}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isMenuItemActive(subItem.href)}
                            className="text-muted-foreground! hover:bg-accent hover:text-foreground! data-[active=true]:bg-accent data-[active=true]:text-foreground!">
                            <NavLink to={subItem.href}>
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isMenuItemActive(item.href, true, item)}
                  className="text-muted-foreground! hover:bg-accent hover:text-foreground! data-[active=true]:bg-accent data-[active=true]:text-foreground!">
                  <NavLink to={item.href ?? '#'}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        ))}
      </SidebarGroup>
    </div>
  );
}
