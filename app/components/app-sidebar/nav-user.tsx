'use client';

import { useApp } from '@/providers/app.provider';
import { routes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@datum-cloud/datum-ui/sidebar';
import { useLingui } from '@lingui/react/macro';
import { Bell, ChevronsUpDown, LogOut, User } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

export function NavUser() {
  const { user } = useApp();
  const { t } = useLingui();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const fullName = useMemo(() => {
    return `${user?.spec?.givenName ?? ''} ${user?.spec?.familyName ?? ''}`;
  }, [user]);

  const initials = useMemo(() => {
    return fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-md">
                {/* <AvatarImage src={user?.spec.avatar} alt={fullName} /> */}
                <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="truncate text-xs">{user?.spec?.email ?? ''}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-md"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-md">
                  {/* <AvatarImage src={user?.avatar} alt={fullName} /> */}
                  <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs">{user?.spec?.email ?? ''}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate(routes.profile.settings())}>
                <User />
                {t`My Profile`}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                {t`Notifications`}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/logout')}>
              <LogOut />
              {t`Log out`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
