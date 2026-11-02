import { timeLabel, type TimelineEvent, type TimelineEventType } from '../../lib/contact-timeline';
import { BadgeState } from '@/components/badge';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  Building2,
  Mail,
  ShieldCheck,
  StickyNote,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Dot icon + colour per event type — mirrors the Pencil design's colour families. */
const DOT: Record<TimelineEventType, { icon: LucideIcon; className: string }> = {
  note: {
    icon: StickyNote,
    className: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  },
  email: { icon: Mail, className: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  org: {
    icon: Building2,
    className: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  },
  group: { icon: Users, className: 'bg-primary/10 text-primary' },
  access: {
    icon: ShieldCheck,
    className: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  },
  signup: { icon: UserPlus, className: 'bg-muted text-muted-foreground' },
};

/** Renders one timeline event: a coloured dot, a title + time head, and an optional detail card. */
export function TimelineItem({ event }: { event: TimelineEvent }) {
  const { t } = useLingui();
  const { icon: Icon, className: dotClass } = DOT[event.type];

  let title: React.ReactNode = null;
  let body: React.ReactNode = null;

  switch (event.type) {
    case 'note':
      title = <Trans>Note by {event.creator || t`someone`}</Trans>;
      body = (
        <div className="bg-card rounded-lg border px-3.5 py-3">
          <Text size="sm" className="break-words whitespace-pre-wrap">
            {event.content}
          </Text>
        </div>
      );
      break;
    case 'email': {
      const subject = event.subject || t`Email`;
      title = <Trans>Email sent · “{subject}”</Trans>;
      body = (
        <div className="bg-card flex items-center gap-2 rounded-lg border px-3.5 py-2.5">
          <Text size="sm" textColor="muted" className="min-w-0 flex-1 truncate">
            {event.template ? `${event.template} · ${event.to}` : event.to}
          </Text>
          {event.delivered ? (
            <BadgeState state="success" message={t`Delivered`} className="shrink-0" />
          ) : null}
        </div>
      );
      break;
    }
    case 'org':
      title = event.role ? (
        <Trans>
          Joined {event.org} as {event.role}
        </Trans>
      ) : (
        <Trans>Joined {event.org}</Trans>
      );
      break;
    case 'group':
      title = <Trans>Added to contact group “{event.group}”</Trans>;
      break;
    case 'access':
      title = <Trans>Platform access approved</Trans>;
      break;
    case 'signup':
      title = event.linked ? (
        <Trans>Signed up · contact created</Trans>
      ) : (
        <Trans>Contact created</Trans>
      );
      break;
  }

  return (
    <div className={cn('flex gap-3 py-2', body ? 'items-start' : 'items-center')}>
      <div
        className={cn(
          'flex size-[30px] shrink-0 items-center justify-center rounded-full',
          dotClass
        )}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <Text size="sm" weight="medium" className="min-w-0 flex-1 truncate">
            {title}
          </Text>
          <Text size="xs" textColor="muted" className="shrink-0">
            {timeLabel(event.timestamp)}
          </Text>
        </div>
        {body}
      </div>
    </div>
  );
}
