import { isPathActive, pickMostSpecificHref } from './use-active-path';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@datum-cloud/datum-ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@datum-cloud/datum-ui/sidebar';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';
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

export function SidebarMenuComponent({ menuItems, className }: SidebarMenuProps) {
  const location = useLocation();

  const checkActive = (href: string) => isPathActive(location.pathname, href);

  // Check if any submenu item is active
  const hasActiveSubmenu = menuItems.some(
    (item) => item.hasSubmenu && item.submenuItems?.some((subItem) => checkActive(subItem.href))
  );

  // Most specific top-level href match — used to avoid lighting up parent
  // items (like "Overview") when a sibling child route is actually active.
  const mostSpecificHref = pickMostSpecificHref(
    location.pathname,
    menuItems.map((m) => m.href)
  );

  const isMenuItemActive = (
    href: string | undefined,
    checkSpecificity: boolean = false,
    currentItem?: MenuItem
  ) => {
    if (href === undefined) return false;

    const isActive = checkActive(href);

    // For submenu items, just return the basic active state
    if (!checkSpecificity || !currentItem) {
      return isActive;
    }

    // For main menu items: if a submenu is active, only allow the parent to be active
    if (hasActiveSubmenu) {
      return currentItem.hasSubmenu && isActive;
    }

    // For main menu items, only the most specific matching href is active
    return currentItem.href === mostSpecificHref;
  };

  return (
    <div data-slot="sidebar-container" className={cn('p-2', className)}>
      <SidebarGroup>
        {menuItems.map((item, index) => (
          <SidebarMenu key={index}>
            {item.hasSubmenu ? (
              <Collapsible
                asChild
                defaultOpen={item.submenuItems?.some((subItem) => checkActive(subItem.href))}
                className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="text-muted-foreground! hover:bg-accent! hover:text-foreground! data-[active=true]:bg-accent data-[active=true]:text-foreground!">
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
                            isActive={checkActive(subItem.href)}
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
