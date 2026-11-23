import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';

/**
 * A pricing's description and notes, as secondary text under its name.
 * The description says what the item is, as customers see it too; the
 * notes are for staff and finance only, so they're labelled as such. Never
 * put the notes in anything that goes to a customer. `clamp` keeps each to
 * two lines, with the whole text on hover, for tables and pickers.
 */
export function PricingInfo({
  description,
  notes,
  clamp = false,
  className,
}: {
  description?: string;
  notes?: string;
  clamp?: boolean;
  className?: string;
}) {
  const shownDescription = description?.trim();
  const shownNotes = notes?.trim();
  if (!shownDescription && !shownNotes) return null;
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {shownDescription ? (
        <Text
          as="p"
          size="xs"
          textColor="muted"
          className={cn('leading-relaxed break-words', clamp && 'line-clamp-2')}
          title={clamp ? shownDescription : undefined}>
          {shownDescription}
        </Text>
      ) : null}
      {shownNotes ? (
        <Text
          as="p"
          size="xs"
          textColor="muted"
          className={cn('leading-relaxed break-words', clamp && 'line-clamp-2')}
          title={clamp ? shownNotes : undefined}>
          <span className="font-medium">
            <Trans>Staff note:</Trans>
          </span>{' '}
          {shownNotes}
        </Text>
      ) : null}
    </div>
  );
}
