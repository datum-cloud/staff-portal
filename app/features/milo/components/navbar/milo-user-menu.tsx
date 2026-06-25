'use client';

import { useApp } from '@/providers/app.provider';
import { routes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { useLingui } from '@lingui/react/macro';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

/**
 * Compact avatar-only user menu for the navbar's right cluster. Mirrors the
 * legacy NavUser menu items without the sidebar-styled trigger.
 */
export function MiloUserMenu() {
  const { user } = useApp();
  const { t } = useLingui();
  const navigate = useNavigate();

  const fullName = useMemo(
    () => `${user?.spec?.givenName ?? ''} ${user?.spec?.familyName ?? ''}`.trim(),
    [user]
  );

  const initials = useMemo(
    () =>
      fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase(),
    [fullName]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t`Account menu`}
        className="bg-card border-border focus-visible:ring-ring hover:bg-foreground/5 flex items-center gap-1 rounded-full border p-0.5 pr-1.5 transition-colors outline-none focus-visible:ring-2">
        <Avatar className="size-7 rounded-full">
          <AvatarFallback className="rounded-full text-xs">{initials}</AvatarFallback>
        </Avatar>
        <ChevronDown className="text-foreground size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-md" side="bottom" align="end" sideOffset={8}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-md">
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
  );
}
