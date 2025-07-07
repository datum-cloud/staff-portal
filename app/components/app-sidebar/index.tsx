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
import {
  Building,
  ChevronRight,
  Handshake,
  Home,
  LucideIcon,
  Newspaper,
  Users,
} from 'lucide-react';
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

  const menuItems: MenuItem[] = [
    {
      title: t`Dashboard`,
      icon: Home,
      href: '/',
      hasSubmenu: false,
    },
    {
      title: t`Customers`,
      icon: Users,
      hasSubmenu: true,
      submenuItems: [
        { title: t`Users`, href: '/customers/users' },
        { title: t`Organizations`, href: '/customers/organizations' },
        { title: t`Projects`, href: '/customers/projects' },
      ],
    },
    {
      title: t`Marketing`,
      icon: Newspaper,
      hasSubmenu: true,
      submenuItems: [
        { title: t`Contacts`, href: '/marketing/contacts' },
        { title: t`Subscriptions`, href: '/marketing/subscriptions' },
      ],
    },
    {
      title: t`Organizations`,
      icon: Building,
      hasSubmenu: true,
      submenuItems: [
        { title: t`Settings`, href: '/organizations/settings' },
        { title: t`Members`, href: '/organizations/members' },
      ],
    },
    {
      title: t`Relationships`,
      icon: Handshake,
      hasSubmenu: true,
      submenuItems: [{ title: t`Vendors`, href: '/relationships/vendors' }],
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
                  defaultOpen={item.submenuItems?.some(
                    (subItem) => location.pathname === subItem.href
                  )}
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
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === subItem.href}>
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
                  <SidebarMenuButton asChild isActive={location.pathname === item.href}>
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
