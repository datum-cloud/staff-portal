'use client';

import { NavUser } from './nav-user';
import { LogoIcon } from '@/components/logo/logo-icon';
import { LogoText } from '@/components/logo/logo-text';
import {
  contactGroupRoutes,
  contactRoutes,
  fraudRoutes,
  groupRoutes,
  orgRoutes,
  projectRoutes,
  routes,
  userRoutes,
} from '@/utils/config/routes.config';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@datum-cloud/datum-ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@datum-cloud/datum-ui/hover-card';
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
} from '@datum-cloud/datum-ui/sidebar';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import {
  ChevronRight,
  Contact,
  Home,
  LucideIcon,
  MailSearch,
  ShieldAlert,
  ShieldUser,
  SquareActivity,
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
  const { open, state, isMobile, closeForNavigation } = useSidebar();
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
    {
      title: t`Dashboard`,
      icon: Home,
      href: '/',
      hasSubmenu: false,
    },
    {
      title: t`Customers`,
      href: userRoutes.list(),
      icon: Users,
      hasSubmenu: true,
      submenuItems: [
        {
          title: t`Users`,
          href: userRoutes.list(),
        },
        {
          title: t`Organizations`,
          href: orgRoutes.list(),
        },
        {
          title: t`Projects`,
          href: projectRoutes.list(),
        },
      ],
    },
    {
      title: t`Contacts`,
      href: contactRoutes.list(),
      icon: Contact,
      hasSubmenu: true,
      submenuItems: [
        {
          title: t`Contacts`,
          href: contactRoutes.list(),
        },
        {
          title: t`Groups`,
          href: contactGroupRoutes.list(),
        },
      ],
    },
    {
      title: t`Groups`,
      href: groupRoutes.list(),
      icon: ShieldUser,
      hasSubmenu: false,
    },
    {
      title: t`Email Activity`,
      href: routes.emailActivity(),
      icon: MailSearch,
      hasSubmenu: false,
    },
    {
      title: t`Activity`,
      href: routes.activity.root(),
      icon: SquareActivity,
      hasSubmenu: false,
    },
    {
      title: t`Fraud & Abuse`,
      href: fraudRoutes.root(),
      icon: ShieldAlert,
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
                state === 'expanded' || isMobile ? (
                  <Collapsible
                    asChild
                    defaultOpen={item.submenuItems?.some((subItem) =>
                      isMenuItemActive(subItem.href)
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
                                isActive={isMenuItemActive(subItem.href)}>
                                <NavLink
                                  to={subItem.href}
                                  onClick={() => {
                                    if (isMobile) closeForNavigation();
                                  }}>
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
                  <HoverCard openDelay={0}>
                    <HoverCardTrigger asChild>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={item.submenuItems?.some((subItem) =>
                            isMenuItemActive(subItem.href)
                          )}>
                          <NavLink to={item.href ?? ''}>
                            <item.icon />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </HoverCardTrigger>
                    <HoverCardContent side="left" align="start" className="w-48 p-2 shadow-sm">
                      <div className="space-y-1">
                        {item.submenuItems?.map((subItem, subIndex) => (
                          <NavLink
                            key={subIndex}
                            to={subItem.href}
                            className={cn(
                              'hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-sm transition-colors',
                              isMenuItemActive(subItem.href) && 'bg-accent text-accent-foreground'
                            )}>
                            {subItem.title}
                          </NavLink>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isMenuItemActive(item.href)}
                    tooltip={item.title}>
                    <NavLink
                      to={item.href ?? ''}
                      onClick={() => {
                        if (isMobile) closeForNavigation();
                      }}>
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
