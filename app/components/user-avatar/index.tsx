import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';
import { cn } from '@datum-cloud/datum-ui/utils';

/** First letters of the first two words, uppercased (e.g. "Ada Lovelace" → "AL"). */
function initialsOf(name?: string): string {
  return (
    (name ?? '')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

interface UserAvatarProps {
  /** Display name — used for the alt text and to derive the initials fallback. */
  name?: string;
  /** Avatar image URL (User `status.avatarUrl`); falls back to initials if absent. */
  avatarUrl?: string;
  /** Classes for the Avatar root (size + shape). Defaults to `rounded-xl`. */
  className?: string;
  /** Classes for the initials fallback (shape + text size). Defaults to `rounded-xl`. */
  fallbackClassName?: string;
}

/**
 * A user's avatar: shows `avatarUrl` when present (auth-provider populated),
 * otherwise the initials. One place so every user avatar renders the same way.
 * Shape defaults to `rounded-xl`; pass an explicit `rounded-*` to override
 * (e.g. the navbar user menu keeps `rounded-full`).
 */
export function UserAvatar({ name, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={cn('rounded-xl', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || 'User'} />}
      <AvatarFallback className={cn('rounded-xl', fallbackClassName)}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
