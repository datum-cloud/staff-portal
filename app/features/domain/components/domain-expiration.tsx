import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { addMonths, isBefore } from 'date-fns';

export interface DomainExpirationProps {
  expiresAt?: string;
  showBadge?: boolean;
}

export const DomainExpiration = ({ expiresAt, showBadge = true }: DomainExpirationProps) => {
  if (!expiresAt) return <>-</>;

  const expiresDate = new Date(expiresAt);
  const soonThreshold = addMonths(new Date(), 1);
  const isExpiringSoon = isBefore(expiresDate, soonThreshold);

  return (
    <div className="flex items-center gap-2">
      <DateTime date={expiresAt} />
      {showBadge && isExpiringSoon && <BadgeState state="warning" message="Expires soon" />}
    </div>
  );
};
