import {
  INVOICE_AGING_BUCKETS,
  getDaysOverdue,
  isPastDueInvoice,
  sortInvoicesPastDueFirst,
  summarizeInvoices,
  type InvoiceAgingBucket,
} from '../../lib/invoice-summary';
import {
  invoiceMatchesSearch,
  toPastInvoiceRow,
  type Invoice,
  type PastInvoiceStatus,
} from '../../utils';
import { BILLING_ACCOUNT_SECTION_IDS } from './billing-account-attention-banner';
import {
  CardHeading,
  CardMessage,
  SectionAnchor,
  TableFrame,
  TableRowsSkeleton,
  frequencyLabel,
} from './card-parts';
import { useAccountInvoices } from './use-account-dashboard';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  TableCard,
} from '@/features/milo';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { createColumnHelper, type ColumnDef } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

interface InvoicesCardProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
}

/** Rows shown before "All invoices" expands the table. */
const PREVIEW_ROWS = 6;
const PAGE_SIZE = 10;

const statusBadgeState: Record<PastInvoiceStatus, string> = {
  paid: 'success',
  open: 'warning',
  pastDue: 'error',
  void: 'pending',
};

const agingLabel = (bucket: InvoiceAgingBucket): string => {
  switch (bucket) {
    case 'days1to30':
      return t`1–30 days overdue`;
    case 'days31to60':
      return t`31–60 days`;
    case 'days60plus':
      return t`60+ days`;
    default:
      return t`Not yet due`;
  }
};

const columnHelper = createColumnHelper<Invoice>();

const shortDate = (date: string | undefined): ReactNode =>
  date ? <DateTime date={date} variant="absolute" format="MMM d" tooltip={false} /> : '—';

const buildColumns = (now: Date) => [
  columnHelper.display({
    id: 'invoice',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Invoice`} />,
    cell: ({ row }) => <DisplayId value={row.original.metadata?.name ?? ''} />,
  }),
  columnHelper.display({
    id: 'period',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Period`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap">
        {shortDate(row.original.spec?.period?.start)} – {shortDate(row.original.spec?.period?.end)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'issued',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Issued`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap">
        {shortDate(row.original.metadata?.creationTimestamp)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'due',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Due`} />,
    cell: ({ row }) => {
      const days = isPastDueInvoice(row.original) ? getDaysOverdue(row.original, now) : 0;
      return (
        <Text
          size="xs"
          className={cn('whitespace-nowrap', days > 0 && 'text-destructive font-medium')}>
          {shortDate(row.original.status?.dueDate)}
          {days > 0 ? <Trans> · {days}d late</Trans> : null}
        </Text>
      );
    },
  }),
  columnHelper.display({
    id: 'amount',
    enableSorting: false,
    header: ({ column }) => (
      <div className="text-right">
        <ListColumnHeader column={column} title={t`Amount`} />
      </div>
    ),
    cell: ({ row }) => (
      <Text size="xs" weight="medium" className="block text-right tabular-nums">
        {toPastInvoiceRow(row.original).amount}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'status',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
    cell: ({ row }) => {
      const { status, statusLabel } = toPastInvoiceRow(row.original);
      return <BadgeState state={statusBadgeState[status]} message={statusLabel} />;
    },
  }),
  columnHelper.display({
    id: 'download',
    enableSorting: false,
    header: () => <span className="sr-only">{t`Download`}</span>,
    cell: ({ row }) => {
      const url = row.original.status?.documentUri;
      return (
        <Button
          type="secondary"
          theme="borderless"
          size="small"
          disabled={!url}
          icon={<ACTION_ICONS.download className="size-4" />}
          onClick={url ? () => window.open(url, '_blank', 'noopener,noreferrer') : undefined}>
          <span className="sr-only">
            {url ? <Trans>Download invoice</Trans> : <Trans>Download unavailable</Trans>}
          </span>
        </Button>
      );
    },
  }),
];

/**
 * The account's invoices: an aging summary, then past-due invoices first.
 * "All invoices" expands the table in place with search and paging.
 */
export function BillingAccountInvoicesCard({ orgName, account, now }: InvoicesCardProps) {
  const { invoices, hasMore, isLoading, isError } = useAccountInvoices(
    orgName,
    account.metadata?.name ?? ''
  );
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => (invoices ? sortInvoicesPastDueFirst(invoices) : []), [invoices]);
  const summary = useMemo(
    () => (invoices ? summarizeInvoices(invoices, now) : undefined),
    [invoices, now]
  );
  const columns = useMemo(() => buildColumns(now) as ColumnDef<Invoice, unknown>[], [now]);
  const filtered = useMemo(
    () =>
      expanded && search.trim()
        ? sorted.filter((invoice) => invoiceMatchesSearch(toPastInvoiceRow(invoice), search))
        : sorted,
    [sorted, expanded, search]
  );
  const rows = expanded ? filtered : sorted.slice(0, PREVIEW_ROWS);
  const canExpand = sorted.length > PREVIEW_ROWS;

  const terms = account.spec?.paymentTerms;
  const count = sorted.length;
  const countLabel = hasMore ? `${count}+` : String(count);
  const frequency = frequencyLabel(terms?.invoiceFrequency);
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const subtitle = invoices ? (
    terms?.netDays !== undefined ? (
      <Trans>
        {countLabel} invoices · net {terms.netDays} · {frequency} on day {invoiceDay}
      </Trans>
    ) : (
      <Trans>
        {countLabel} invoices · {frequency} on day {invoiceDay}
      </Trans>
    )
  ) : null;

  return (
    <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.invoices}>
      <TableCard
        framed={false}
        contentClassName="flex flex-col gap-4"
        title={<CardHeading title={<Trans>Invoices</Trans>} subtitle={subtitle} />}
        action={
          canExpand ? (
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              icon={<Icon icon={expanded ? ChevronUp : ArrowRight} size={14} />}
              iconPosition="right">
              {expanded ? <Trans>Show fewer</Trans> : <Trans>All invoices</Trans>}
            </Button>
          ) : undefined
        }>
        {isLoading ? (
          <>
            <AgingSkeleton />
            <TableFrame>
              <TableRowsSkeleton />
            </TableFrame>
          </>
        ) : isError || !summary ? (
          <CardMessage>
            <Trans>Couldn&apos;t load invoices.</Trans>
          </CardMessage>
        ) : count === 0 ? (
          <CardMessage>
            <Trans>No invoices yet.</Trans>
          </CardMessage>
        ) : (
          <>
            <AgingSummary aging={summary.aging} currency={account.spec?.currencyCode ?? 'USD'} />
            {expanded ? (
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t`Search invoices`}
                aria-label={t`Search invoices`}
                className="h-9 w-full sm:w-64"
              />
            ) : null}
            <TableFrame>
              {rows.length === 0 ? (
                <CardMessage className="px-4 py-6">
                  <Trans>No invoices match your search.</Trans>
                </CardMessage>
              ) : (
                <DataTable.Client
                  // Remount when expanding so paging starts from the first page.
                  key={expanded ? 'all' : 'preview'}
                  data={rows}
                  columns={columns}
                  pageSize={expanded ? PAGE_SIZE : PREVIEW_ROWS}
                  getRowId={(row) => row.metadata?.name ?? ''}>
                  <DataTable.Content
                    headerClassName={LIST_TABLE_HEADER_CLASS}
                    headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
                    headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
                    bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
                    rowClassName={LIST_TABLE_ROW_CLASS}
                    cellClassName={EMBEDDED_TABLE_CELL_CLASS}
                    emptyMessage={t`No invoices`}
                  />
                  {expanded && rows.length > PAGE_SIZE ? (
                    <div className="dark:border-border border-t border-[#efefed] px-2 py-1">
                      <DataTable.Pagination pageSizes={[10, 25, 50]} />
                    </div>
                  ) : null}
                </DataTable.Client>
              )}
            </TableFrame>
          </>
        )}
      </TableCard>
    </SectionAnchor>
  );
}

function AgingSummary({
  aging,
  currency,
}: {
  aging: Readonly<Record<InvoiceAgingBucket, number>>;
  currency: string;
}) {
  return (
    <dl className="grid grid-cols-2 gap-1 @3xl/main:grid-cols-4">
      {INVOICE_AGING_BUCKETS.map((bucket) => {
        const overdue = bucket !== 'notDue' && aging[bucket] > 0;
        return (
          <div
            key={bucket}
            className={cn(
              'flex flex-col gap-0.5 rounded-sm px-3 py-2',
              overdue ? 'bg-destructive/10' : 'bg-muted/60'
            )}>
            <dt>
              <Text
                as="span"
                size="xs"
                className={overdue ? 'text-destructive' : 'text-muted-foreground'}>
                {agingLabel(bucket)}
              </Text>
            </dt>
            <dd>
              <Text
                as="span"
                size="sm"
                weight="medium"
                className={cn('tabular-nums', overdue && 'text-destructive')}>
                {formatCurrency({ amount: aging[bucket], currency })}
              </Text>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function AgingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-1 @3xl/main:grid-cols-4" aria-busy="true">
      {INVOICE_AGING_BUCKETS.map((bucket) => (
        <Skeleton key={bucket} className="h-12 w-full rounded-sm" />
      ))}
    </div>
  );
}
