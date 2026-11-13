import { useAccountHealth } from '../../hooks';
import {
  UNUSUAL_INVOICE_FACTOR,
  type HealthCheckKey,
  type HealthIssue,
} from '../../lib/account-health';
import { formatMoney, type BillingAccount } from '../../utils';
import { formatCardLabel } from '../card-brand-icon';
import { BILLING_ACCOUNT_SECTION_IDS, InlineDate } from './card-parts';
import { AttentionBannerShell } from '@/components/attention-banner';
import { BadgeState } from '@/components/badge';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { plural, t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface AttentionBannerProps {
  orgName: string;
  account: BillingAccount;
  cloudPortalUrl?: string | null;
  now: Date;
}

interface IssueAction {
  label: ReactNode;
  href: string;
  external?: boolean;
}

interface IssueCopy {
  badge: string;
  title: ReactNode;
  detail: ReactNode;
  action?: IssueAction;
}

interface CopyContext {
  orgName: string;
  cloudPortalUrl?: string | null;
}

const sectionHref = (id: string) => `#${id}`;

const cloudPortalAction = (ctx: CopyContext): IssueAction | undefined =>
  ctx.cloudPortalUrl
    ? { label: <Trans>Open in Cloud Portal</Trans>, href: ctx.cloudPortalUrl, external: true }
    : undefined;

const usageAction = (ctx: CopyContext): IssueAction => ({
  label: <Trans>Inspect usage</Trans>,
  href: orgRoutes.usage(ctx.orgName),
});

const paymentTermsAction: IssueAction = {
  label: <Trans>Review payment terms</Trans>,
  href: sectionHref(BILLING_ACCOUNT_SECTION_IDS.paymentTerms),
};

/** Copy and fix-it link for one issue. */
function describeIssue(issue: HealthIssue, ctx: CopyContext): IssueCopy {
  switch (issue.key) {
    case 'invoicePastDue': {
      const amount = formatMoney(issue.amount, issue.currency);
      const name = issue.invoiceName;
      const days = issue.daysOverdue;
      // Without a due date, or on the day itself, there's no count to give.
      const overdue = days > 0 ? <Plural value={days} one="# day" other="# days" /> : null;
      return {
        badge: t`Past due`,
        title: <Trans>Invoice past due — {amount}</Trans>,
        detail:
          issue.dueDate && overdue ? (
            <Trans>
              {name} was due <InlineDate date={issue.dueDate} variant="absolute" format="MMM d" />{' '}
              and is {overdue} overdue.
            </Trans>
          ) : issue.dueDate ? (
            <Trans>
              {name} was due <InlineDate date={issue.dueDate} variant="absolute" format="MMM d" />.
            </Trans>
          ) : (
            <Trans>{name} is past due.</Trans>
          ),
        action: {
          label: <Trans>View invoices</Trans>,
          href: sectionHref(BILLING_ACCOUNT_SECTION_IDS.invoices),
        },
      };
    }
    case 'invoiceUnusual': {
      const count = issue.invoiceNames.length;
      const maxTotal = formatMoney(issue.maxTotal, issue.currency);
      const baseline = formatMoney(issue.baseline, issue.currency);
      const factor = UNUSUAL_INVOICE_FACTOR;
      return {
        badge: t`Unusual`,
        title: (
          <Plural
            value={count}
            one="Invoice amount far outside the normal range"
            other="# invoice amounts far outside the normal range"
          />
        ),
        detail: (
          <Trans>
            Up to {maxTotal}, over {factor}× the median of this account&apos;s other recent invoices
            ({baseline}). Check usage for a metering or pricing error.
          </Trans>
        ),
        action: usageAction(ctx),
      };
    }
    case 'largeCardBalance': {
      const outstanding = formatMoney(issue.outstanding, issue.currency);
      const count = issue.unpaidCount;
      return {
        badge: t`Card limit`,
        title: <Trans>Large open balance on a card-billed account</Trans>,
        detail: (
          <Trans>
            {outstanding} across {count} unpaid invoices will be charged to the card on file.
            Charges this size are likely to be declined.
          </Trans>
        ),
        action: paymentTermsAction,
      };
    }
    case 'paymentMethod':
      return issue.reason === 'failed'
        ? {
            badge: t`Payment`,
            title: <Trans>Default payment method failed</Trans>,
            detail: issue.failureMessage ?? (
              <Trans>The payment provider rejected {issue.paymentMethodName}.</Trans>
            ),
            action: cloudPortalAction(ctx),
          }
        : {
            badge: t`Payment`,
            title: <Trans>No payment method</Trans>,
            detail: <Trans>This account pays by card but has no payment method on file.</Trans>,
            action: cloudPortalAction(ctx),
          };
    case 'cardExpiry': {
      const card = formatCardLabel(issue, issue.paymentMethodName);
      // A UTC month end: in UTC so it doesn't read as the 1st east of UTC.
      const expiry = (
        <InlineDate date={issue.expiresAt} variant="absolute" format="MMM d, yyyy" timezone="UTC" />
      );
      return {
        badge: t`Card expiry`,
        title: issue.expired ? <Trans>Card expired</Trans> : <Trans>Card expires soon</Trans>,
        detail: issue.expired ? (
          <Trans>
            {card} expired {expiry}.
          </Trans>
        ) : (
          <Trans>
            {card} expires {expiry}.
          </Trans>
        ),
        action: cloudPortalAction(ctx),
      };
    }
    case 'creditLimit': {
      // Spend is usage, formatted like the usage tile; the limit is a billing amount.
      const spend = formatCurrency({ amount: issue.cycleSpend, currency: issue.currency });
      const limit = formatMoney(issue.creditLimit, issue.currency);
      return {
        badge: t`Credit limit`,
        title: <Trans>Spend this cycle over the credit limit</Trans>,
        detail: (
          <Trans>
            {spend} spent so far this cycle against a {limit} per-cycle credit limit.
          </Trans>
        ),
        action: paymentTermsAction,
      };
    }
    case 'usageSpike': {
      const current = formatCurrency({ amount: issue.currentSpend, currency: issue.currency });
      const previous = formatCurrency({ amount: issue.previousSpend, currency: issue.currency });
      const factor = Math.round(issue.factor);
      return {
        badge: t`Usage`,
        title: <Trans>Usage spend spiking</Trans>,
        detail: (
          <Trans>
            {current} so far this cycle, {factor}× the {previous} spent by this point last cycle.
          </Trans>
        ),
        action: usageAction(ctx),
      };
    }
    case 'taxId': {
      const country = issue.country;
      return {
        badge: t`Tax`,
        title: <Trans>No tax ID on file</Trans>,
        detail: country ? (
          <Trans>Business account with a billing address in {country} and no tax ID.</Trans>
        ) : (
          <Trans>Business account with no tax ID.</Trans>
        ),
      };
    }
    case 'offer':
      return {
        badge: t`Offer`,
        title: <Trans>No active offer</Trans>,
        detail: <Trans>Usage on this account isn&apos;t priced by an offer.</Trans>,
      };
  }
}

/** Short phrase for the collapsed summary, e.g. "2 past-due invoices". */
function summaryLabel(key: HealthCheckKey, count: number): string {
  switch (key) {
    case 'invoicePastDue':
      return plural(count, { one: '# past-due invoice', other: '# past-due invoices' });
    case 'invoiceUnusual':
      return t`unusual invoice totals`;
    case 'largeCardBalance':
      return t`large card balance`;
    case 'paymentMethod':
      return t`payment method problem`;
    case 'cardExpiry':
      return t`card expiry`;
    case 'creditLimit':
      return t`over credit limit`;
    case 'usageSpike':
      return t`usage spike`;
    case 'taxId':
      return t`missing tax ID`;
    case 'offer':
      return t`no offer`;
  }
}

/** What a passing check confirms, for the line of passing checks. */
function passingLabel(key: HealthCheckKey): string {
  switch (key) {
    case 'invoicePastDue':
      return t`Nothing past due`;
    case 'invoiceUnusual':
      return t`Invoice totals normal`;
    case 'largeCardBalance':
      return t`Card balance OK`;
    case 'paymentMethod':
      return t`Payment method OK`;
    case 'cardExpiry':
      return t`Card not expiring`;
    case 'creditLimit':
      return t`Within credit limit`;
    case 'usageSpike':
      return t`Usage steady`;
    case 'taxId':
      return t`Tax details OK`;
    case 'offer':
      return t`Offer active`;
  }
}

const groupSummary = (issues: readonly HealthIssue[]): string =>
  Object.entries(
    issues.reduce<Partial<Record<HealthCheckKey, number>>>(
      (counts, issue) => ({ ...counts, [issue.key]: (counts[issue.key] ?? 0) + 1 }),
      {}
    )
  )
    .map(([key, count]) => summaryLabel(key as HealthCheckKey, count ?? 0))
    .join(' · ');

function IssueRow({ issue, ctx }: { issue: HealthIssue; ctx: CopyContext }) {
  const copy = describeIssue(issue, ctx);
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-md px-2.5 py-2.5 sm:flex-row sm:items-center sm:gap-3',
        issue.severity === 'error' && 'bg-destructive/5'
      )}>
      <span className="w-24 shrink-0">
        <BadgeState state={issue.severity} message={copy.badge} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="sm" weight="medium">
          {copy.title}
        </Text>
        <Text size="xs" textColor="muted">
          {copy.detail}
        </Text>
      </div>
      {copy.action ? (
        <LinkButton
          type="secondary"
          theme="outline"
          size="small"
          className="shrink-0 self-start sm:self-center"
          href={copy.action.href}
          {...(copy.action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          icon={
            copy.action.external ? (
              <ACTION_ICONS.externalLink className="size-3.5" />
            ) : (
              <Icon icon={ArrowRight} size={14} />
            )
          }
          iconPosition="right">
          {copy.action.label}
        </LinkButton>
      ) : null}
    </li>
  );
}

/** Checks that didn't finish: their data failed to load, or they saw only some invoices. */
function Unchecked({ failed, partial }: { failed: number; partial: number }) {
  const parts = [
    failed > 0
      ? plural(failed, { one: "# check couldn't run", other: "# checks couldn't run" })
      : null,
    partial > 0
      ? plural(partial, {
          one: '# check saw only some invoices',
          other: '# checks saw only some invoices',
        })
      : null,
  ].filter(Boolean);
  return <>{parts.join(' · ')}</>;
}

function PassingLine({
  passing,
  failed,
  partial,
  isLoading,
}: {
  passing: HealthCheckKey[];
  failed: number;
  partial: number;
  isLoading: boolean;
}) {
  const count = passing.length;
  return (
    <div className="border-border flex min-h-10 items-center gap-2 border-t px-4 py-2">
      <Icon icon={STATUS_ICONS.success} size={14} className="text-success shrink-0" aria-hidden />
      <Text size="xs" weight="medium" className="shrink-0">
        <Plural value={count} one="# check passing" other="# checks passing" />
      </Text>
      <Text size="xs" textColor="muted" className="min-w-0 truncate">
        {passing.map(passingLabel).join(' · ')}
        {failed + partial > 0 ? (
          <>
            {count > 0 ? ' · ' : ''}
            <Unchecked failed={failed} partial={partial} />
          </>
        ) : null}
      </Text>
      {isLoading ? <Skeleton className="ml-auto h-3 w-24 shrink-0 rounded" /> : null}
    </div>
  );
}

/**
 * What needs a person on this account, worst first, each with a way to fix
 * it. Issues show as soon as the data that finds them loads; the rest of the
 * checks fill in behind them.
 */
export function BillingAccountAttentionBanner({
  orgName,
  account,
  cloudPortalUrl,
  now,
}: AttentionBannerProps) {
  const { health, isLoading } = useAccountHealth(orgName, account, now);
  const { issues, passing, pending, incomplete } = health;
  // Checks still waiting once everything has loaded had a request fail.
  const failed = isLoading ? 0 : pending.length;
  const partial = incomplete.length;
  const ctx: CopyContext = { orgName, cloudPortalUrl };

  return (
    <AttentionBannerShell
      label={t`Account attention`}
      isLoading={isLoading}
      total={issues.length}
      defaultExpanded
      clearSummary={
        failed + partial > 0 ? (
          <Unchecked failed={failed} partial={partial} />
        ) : (
          passing.map(passingLabel).join(' · ')
        )
      }
      incomplete={
        failed > 0 ? (
          <Trans>Some checks couldn&apos;t run</Trans>
        ) : partial > 0 ? (
          <Trans>Some checks couldn&apos;t see every invoice</Trans>
        ) : undefined
      }
      issueSummary={groupSummary(issues)}
      footer={
        <PassingLine passing={passing} failed={failed} partial={partial} isLoading={isLoading} />
      }>
      <ul className="flex flex-col gap-1">
        {issues.map((issue, index) => (
          <IssueRow key={`${issue.key}-${index}`} issue={issue} ctx={ctx} />
        ))}
      </ul>
    </AttentionBannerShell>
  );
}
