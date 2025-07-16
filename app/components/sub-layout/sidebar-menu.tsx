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
import { NavLink, useLocation, useMatches } from 'react-router';

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
  const matches = useMatches();
  const parentMatch = matches[matches.length - 2];

  const isMenuItemActive = (href: string | undefined) => {
    if (href === undefined) return false;

    if (href === '') {
      return normalizePath(location.pathname) === normalizePath(parentMatch.pathname);
    }

    if (href.startsWith('./')) {
      const relativePath = href.substring(2);
      return location.pathname.endsWith(relativePath);
    }

    return location.pathname.startsWith(href);
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
                  isActive={isMenuItemActive(item.href)}
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
