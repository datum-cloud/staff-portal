import {
  INVOICE_AGING_BUCKETS,
  getDaysOverdue,
  isPastDueInvoice,
  sortInvoicesPastDueFirst,
  summarizeInvoices,
  type InvoiceAgingBucket,
} from '../../lib/invoice-summary';
import {
  formatMoney,
  getAccountCurrency,
  getEffectiveNetDays,
  invoiceMatchesSearch,
  PAST_INVOICE_STATUS_BADGE,
  toPastInvoiceRow,
  type Invoice,
} from '../../utils';
import { BILLING_ACCOUNT_SECTION_IDS } from './billing-account-attention-banner';
import {
  CardMessage,
  SectionAnchor,
  TableRowsSkeleton,
  frequencyLabel,
  InlineDate,
} from './card-parts';
import { useAccountInvoices } from './use-account-dashboard';
import { BadgeState } from '@/components/badge';
import { DisplayId } from '@/components/display';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  TABLE_CARD_FRAME_CLASS,
  TableCard,
} from '@/features/milo';
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

/**
 * Billing periods and due dates are UTC midnights, so show them in UTC: in
 * a local timezone west of UTC they'd read a day early.
 */
const billingDate = (date: string | undefined): ReactNode =>
  date ? <InlineDate date={date} variant="absolute" format="MMM d" timezone="UTC" /> : '—';

/** When the invoice was created, in the viewer's timezone. */
const shortDate = (date: string | undefined): ReactNode =>
  date ? <InlineDate date={date} variant="absolute" format="MMM d" /> : '—';

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
        {billingDate(row.original.spec?.period?.start)} –{' '}
        {billingDate(row.original.spec?.period?.end)}
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
          {billingDate(row.original.status?.dueDate)}
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
      return <BadgeState state={PAST_INVOICE_STATUS_BADGE[status]} message={statusLabel} />;
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
  const netDays = getEffectiveNetDays(account);
  const count = sorted.length;
  const countLabel = hasMore ? `${count}+` : String(count);
  const frequency = frequencyLabel(terms?.invoiceFrequency);
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const subtitle = invoices ? (
    netDays !== undefined ? (
      <Trans>
        {countLabel} invoices · net {netDays} · {frequency} on day {invoiceDay}
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
        title={<Trans>Invoices</Trans>}
        description={subtitle}
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
            <div className={TABLE_CARD_FRAME_CLASS}>
              <TableRowsSkeleton />
            </div>
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
            <AgingSummary aging={summary.aging} currency={getAccountCurrency(account)} />
            {expanded ? (
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t`Search invoices`}
                aria-label={t`Search invoices`}
                className="h-9 w-full sm:w-64"
              />
            ) : null}
            <div className={TABLE_CARD_FRAME_CLASS}>
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
            </div>
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
    <dl className="grid grid-cols-2 gap-2 @3xl/main:grid-cols-4">
      {INVOICE_AGING_BUCKETS.map((bucket) => {
        const overdue = bucket !== 'notDue' && aging[bucket] > 0;
        return (
          <div
            key={bucket}
            className={cn(
              'flex flex-col gap-0.5 rounded-md px-3 py-2',
              overdue ? 'bg-destructive/10' : 'bg-background'
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
                {formatMoney(aging[bucket], currency)}
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
    <div className="grid grid-cols-2 gap-2 @3xl/main:grid-cols-4" aria-busy="true">
      {INVOICE_AGING_BUCKETS.map((bucket) => (
        <Skeleton key={bucket} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
