import {
  UNUSUAL_INVOICE_FACTOR,
  type HealthCheckKey,
  type HealthIssue,
  type HealthSeverity,
} from '../../lib/account-health';
import { useAccountHealth } from './use-account-dashboard';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { ArrowRight, ChevronDown, CircleCheck, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/**
 * Dashboard sections the fix-it buttons scroll to. The cards that render
 * these sections set the matching `id`.
 */
export const BILLING_ACCOUNT_SECTION_IDS = {
  invoices: 'invoices',
  paymentTerms: 'payment-terms',
  offer: 'offer',
} as const;

interface AttentionBannerProps {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
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

const SEVERITY_BADGE_STATE: Record<HealthSeverity, string> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const money = (amount: number, currency: string) => formatCurrency({ amount, currency });

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
      const amount = money(issue.amount, issue.currency);
      const name = issue.invoiceName;
      const days = issue.daysOverdue;
      return {
        badge: t`Past due`,
        title: <Trans>Invoice past due — {amount}</Trans>,
        detail: issue.dueDate ? (
          <Trans>
            {name} was due{' '}
            <DateTime date={issue.dueDate} variant="absolute" format="MMM d" tooltip={false} /> and
            is {days} days overdue.
          </Trans>
        ) : (
          <Trans>
            {name} is {days} days overdue.
          </Trans>
        ),
        action: {
          label: <Trans>View invoices</Trans>,
          href: sectionHref(BILLING_ACCOUNT_SECTION_IDS.invoices),
        },
      };
    }
    case 'invoiceUnusual': {
      const count = issue.invoiceNames.length;
      const maxTotal = money(issue.maxTotal, issue.currency);
      const median = money(issue.median, issue.currency);
      const factor = UNUSUAL_INVOICE_FACTOR;
      return {
        badge: t`Unusual`,
        title:
          count === 1 ? (
            <Trans>Invoice amount far outside the normal range</Trans>
          ) : (
            <Trans>{count} invoice amounts far outside the normal range</Trans>
          ),
        detail: (
          <Trans>
            Up to {maxTotal}, over {factor}× this account&apos;s median invoice ({median}). Likely a
            metering or pricing error.
          </Trans>
        ),
        action: usageAction(ctx),
      };
    }
    case 'largeCardBalance': {
      const outstanding = money(issue.outstanding, issue.currency);
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
      const card = issue.last4
        ? `${issue.paymentMethodName} •••• ${issue.last4}`
        : issue.paymentMethodName;
      const expiry = (
        <DateTime date={issue.expiresAt} variant="absolute" format="MMM d, yyyy" tooltip={false} />
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
      const outstanding = money(issue.outstanding, issue.currency);
      const limit = money(issue.creditLimit, issue.currency);
      return {
        badge: t`Credit limit`,
        title: <Trans>Open balance over the credit limit</Trans>,
        detail: (
          <Trans>
            {outstanding} owed against a {limit} credit limit.
          </Trans>
        ),
        action: paymentTermsAction,
      };
    }
    case 'usageSpike': {
      const current = money(issue.currentSpend, issue.currency);
      const previous = money(issue.previousSpend, issue.currency);
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
        action: cloudPortalAction(ctx),
      };
    }
    case 'offer':
      return {
        badge: t`Offer`,
        title: <Trans>No active offer</Trans>,
        detail: <Trans>Usage on this account isn&apos;t priced by an offer.</Trans>,
        action: {
          label: <Trans>Choose an offer</Trans>,
          href: sectionHref(BILLING_ACCOUNT_SECTION_IDS.offer),
        },
      };
  }
}

/** Short phrase for the collapsed summary, e.g. "2 past-due invoices". */
function summaryLabel(key: HealthCheckKey, count: number): string {
  switch (key) {
    case 'invoicePastDue':
      return count === 1 ? t`1 past-due invoice` : t`${count} past-due invoices`;
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
        <BadgeState state={SEVERITY_BADGE_STATE[issue.severity]} message={copy.badge} />
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

function PassingLine({
  passing,
  failedToRun,
  isLoading,
}: {
  passing: HealthCheckKey[];
  failedToRun: number;
  isLoading: boolean;
}) {
  const count = passing.length;
  return (
    <div className="border-border flex min-h-10 items-center gap-2 border-t px-4 py-2">
      <Icon icon={CircleCheck} size={14} className="shrink-0 text-green-600" aria-hidden />
      <Text size="xs" weight="medium" className="shrink-0">
        {count === 1 ? <Trans>1 check passing</Trans> : <Trans>{count} checks passing</Trans>}
      </Text>
      <Text size="xs" textColor="muted" className="min-w-0 truncate">
        {passing.map(passingLabel).join(' · ')}
        {failedToRun > 0 ? (
          <>
            {count > 0 ? ' · ' : ''}
            {failedToRun === 1 ? (
              <Trans>1 check couldn&apos;t run</Trans>
            ) : (
              <Trans>{failedToRun} checks couldn&apos;t run</Trans>
            )}
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
  const [expanded, setExpanded] = useState(true);
  const { health, isLoading } = useAccountHealth(orgName, account, now);
  const { issues, passing, pending } = health;
  const total = issues.length;
  // Checks still waiting once everything has loaded had a request fail.
  const failedToRun = isLoading ? 0 : pending.length;
  const ctx: CopyContext = { orgName, cloudPortalUrl };

  return (
    <section
      aria-label={t`Account attention`}
      className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="flex h-12 items-center gap-3 px-4">
        {total === 0 && isLoading ? (
          <>
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-56 rounded" />
          </>
        ) : total === 0 ? (
          <>
            <Icon icon={CircleCheck} size={16} className="shrink-0 text-green-600" aria-hidden />
            <Text size="sm" weight="medium" className="shrink-0">
              <Trans>All clear</Trans>
            </Text>
            <Text size="sm" textColor="muted" className="hidden min-w-0 truncate @3xl/main:block">
              {passing.map(passingLabel).join(' · ')}
            </Text>
          </>
        ) : (
          <>
            <Icon icon={TriangleAlert} size={16} className="shrink-0 text-amber-500" aria-hidden />
            <Text size="sm" weight="medium" className="shrink-0">
              {total === 1 ? (
                <Trans>1 thing needs attention</Trans>
              ) : (
                <Trans>{total} things need attention</Trans>
              )}
            </Text>
            <Text size="sm" textColor="muted" className="hidden min-w-0 truncate @3xl/main:block">
              {groupSummary(issues)}
            </Text>
            <div className="ml-auto shrink-0">
              <Button
                type="quaternary"
                theme="borderless"
                size="xs"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                icon={
                  <Icon
                    icon={ChevronDown}
                    size={14}
                    className={cn('transition-transform', expanded && 'rotate-180')}
                  />
                }
                iconPosition="right">
                {expanded ? <Trans>Hide</Trans> : <Trans>Show all</Trans>}
              </Button>
            </div>
          </>
        )}
      </div>
      {total > 0 && expanded ? (
        <>
          <ul className="border-border flex flex-col gap-1 border-t p-1.5">
            {issues.map((issue, index) => (
              <IssueRow key={`${issue.key}-${index}`} issue={issue} ctx={ctx} />
            ))}
          </ul>
          <PassingLine passing={passing} failedToRun={failedToRun} isLoading={isLoading} />
        </>
      ) : null}
      {total === 0 && !isLoading && failedToRun > 0 ? (
        <PassingLine passing={passing} failedToRun={failedToRun} isLoading={false} />
      ) : null}
    </section>
  );
}
