'use client';

import { NavUser } from './nav-user';
import { LogoIcon } from '@/components/logo/logo-icon';
import { LogoText } from '@/components/logo/logo-text';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/modules/shadcn/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/modules/shadcn/ui/sidebar';
import { useLingui } from '@lingui/react/macro';
import { Building2, ChevronRight, Folders, LucideIcon, SquareActivity, Users } from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, useLocation } from 'react-router';

interface SubMenuItem {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  hasSubmenu: boolean;
  submenuItems?: SubMenuItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, state } = useSidebar();
  const { t } = useLingui();
  const location = useLocation();

  // Helper function to check if a menu item is active
  const isMenuItemActive = (href: string | undefined) => {
    if (!href) return false;

    // Special case for dashboard (root path)
    if (href === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }

    // For other routes, use exact path matching for better precision
    // This prevents /users from being active when on /users/123
    const normalizedHref = href.replace(/\/+$/, '');
    const normalizedPathname = location.pathname.replace(/\/+$/, '');

    // Check if we're exactly on the route or on a sub-route
    return (
      normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + '/')
    );
  };

  const menuItems: MenuItem[] = [
    // {
    //   title: t`Dashboard`,
    //   icon: Home,
    //   href: '/',
    //   hasSubmenu: false,
    // },
    {
      title: t`Users`,
      icon: Users,
      href: '/users',
      hasSubmenu: false,
    },
    {
      title: t`Organizations`,
      icon: Building2,
      href: '/organizations',
      hasSubmenu: false,
    },
    {
      title: t`Projects`,
      icon: Folders,
      href: '/projects',
      hasSubmenu: false,
    },
    {
      title: t`Activity`,
      href: `/activity`,
      icon: SquareActivity,
      hasSubmenu: false,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex h-12 flex-col justify-center px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          <LogoIcon
            width={24}
            className={cn('transition-transform duration-500', !open && 'rotate-[360deg]')}
          />
          {state === 'expanded' && (
            <LogoText width={55} className="transition-opacity duration-500" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
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
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.submenuItems?.map((subItem, subIndex) => (
                          <SidebarMenuSubItem key={subIndex}>
                            <SidebarMenuSubButton asChild isActive={isMenuItemActive(subItem.href)}>
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
                  <SidebarMenuButton asChild isActive={isMenuItemActive(item.href)}>
                    <NavLink to={item.href ?? ''}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          ))}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
