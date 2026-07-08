import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';

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
  /** Classes for the Avatar root (size + shape). */
  className?: string;
  /** Classes for the initials fallback (shape + text size). */
  fallbackClassName?: string;
}

/**
 * A user's avatar: shows `avatarUrl` when present (auth-provider populated),
 * otherwise the initials. One place so every user avatar renders the same way.
 */
export function UserAvatar({ name, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || 'User'} />}
      <AvatarFallback className={fallbackClassName}>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
