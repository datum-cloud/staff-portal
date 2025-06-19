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
  SidebarGroupLabel,
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
import { uiConfig } from '@/ui.config';
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

function groupByParent(items: typeof uiConfig) {
  const parentMap = new Map<string, typeof uiConfig>();
  const childrenMap = new Map<string, typeof uiConfig>();

  // First pass: identify parents and children
  items.forEach((item) => {
    if (item.menu.parent) {
      if (!childrenMap.has(item.menu.parent)) {
        childrenMap.set(item.menu.parent, []);
      }
      childrenMap.get(item.menu.parent)?.push(item);
    } else {
      if (!parentMap.has(item.name)) {
        parentMap.set(item.name, []);
      }
      parentMap.get(item.name)?.push(item);
    }
  });

  // Second pass: create the grouped structure
  const groupedItems = Array.from(parentMap.entries()).map(([parentName, parentItems]) => {
    const children = childrenMap.get(parentName) || [];
    return {
      ...parentItems[0],
      children,
    };
  });

  return groupedItems;
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

  const groupedConfig = React.useMemo(() => groupByParent(uiConfig), [uiConfig]);

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

        {groupedConfig.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            {groupedConfig.map((item, index) => {
              const url = `/resources/${item.resource.group}/${item.resource.kind}`;
              return (
                <SidebarMenu key={index}>
                  {item.children && item.children.length > 0 ? (
                    <Collapsible asChild className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.menu.label}>
                            <item.menu.icon />
                            <NavLink to={url}>
                              <span>{item.menu.label}</span>
                            </NavLink>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child, childIndex) => {
                              const url = `/resources/${child.resource.group}/${child.resource.kind}`;
                              return (
                                <SidebarMenuSubItem key={childIndex}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={location.pathname === url}>
                                    <NavLink to={url}>
                                      <child.menu.icon />
                                      <span>{child.menu.label}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === url}>
                        <NavLink to={url}>
                          <item.menu.icon />
                          <span>{item.menu.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              );
            })}
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
