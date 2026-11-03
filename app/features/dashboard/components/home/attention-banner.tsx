import { AttentionBannerShell } from '@/components/attention-banner';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Trans } from '@lingui/react/macro';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface AttentionItem {
  key: string;
  count: number;
  label: ReactNode;
  href: string;
}

interface AttentionBannerProps {
  items: AttentionItem[];
  isLoading: boolean;
}

/**
 * Platform counterpart of cloud-portal's project health banner: "All clear"
 * when nothing needs a person, else a count of what does, expandable into one
 * row per kind of work with a link to where it's done.
 */
export function AttentionBanner({ items, isLoading }: AttentionBannerProps) {
  const active = items.filter((i) => i.count > 0);
  const total = active.reduce((sum, i) => sum + i.count, 0);

  return (
    <AttentionBannerShell
      label="Platform attention"
      isLoading={isLoading}
      total={total}
      clearSummary={
        <Trans>No pending approvals, fraud reviews, or quota limits need attention.</Trans>
      }
      issueSummary={active.map((i, idx) => (
        <span key={i.key}>
          {idx > 0 && ' · '}
          {i.count} {i.label}
        </span>
      ))}>
      <div className="border-border flex flex-col border-t p-1.5">
        {active.map((i) => (
          <Link
            key={i.key}
            to={i.href}
            className="hover:bg-accent flex h-9 items-center gap-2 rounded-md px-2.5 text-sm">
            <span className="font-medium tabular-nums">{i.count}</span>
            <span className="text-muted-foreground min-w-0 flex-1 truncate">{i.label}</span>
            <Icon icon={ChevronRight} size={14} className="text-icon-quaternary" aria-hidden />
          </Link>
        ))}
      </div>
    </AttentionBannerShell>
  );
}
