'use client';

import { UserAvatar } from '@/components/user-avatar';
import { useApp } from '@/providers/app.provider';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { routes } from '@/utils/config/routes.config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { Bell, ChevronDown, User } from 'lucide-react';
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

  const avatarUrl = user?.status?.avatarUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t`Account menu`}
        className="bg-card focus-visible:ring-ring hover:bg-foreground/5 flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors outline-none focus-visible:ring-2">
        <UserAvatar
          name={fullName}
          avatarUrl={avatarUrl}
          className="size-7 rounded-full"
          fallbackClassName="rounded-full text-xs"
        />
        <Icon icon={ChevronDown} className="text-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-md" side="bottom" align="end" sideOffset={8}>
        <DropdownMenuLabel className="p-0 font-normal">
          <Text as="div" className="flex items-center gap-2 px-1 py-1.5 text-left">
            <UserAvatar
              name={fullName}
              avatarUrl={avatarUrl}
              className="size-8 rounded-md"
              fallbackClassName="rounded-md"
            />
            <Text as="div" className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{fullName}</span>
              <Text size="xs" ellipsis>
                {user?.spec?.email ?? ''}
              </Text>
            </Text>
          </Text>
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
          <ACTION_ICONS.logout />
          {t`Log out`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
