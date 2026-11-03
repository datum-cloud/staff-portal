import { useAccountInvoices } from '../../hooks';
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
  type PastInvoiceRow,
  type Invoice,
  type BillingAccount,
} from '../../utils';
import {
  BILLING_ACCOUNT_SECTION_IDS,
  CardQueryState,
  SectionAnchor,
  TableRowsSkeleton,
  frequencyLabel,
  InlineDate,
} from './card-parts';
import { BadgeState } from '@/components/badge';
import { DisplayId } from '@/components/display';
import { EmptyState } from '@/components/empty-state';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  TABLE_CARD_FOOTER_CLASS,
  TABLE_CARD_FRAME_CLASS,
  TableCard,
} from '@/features/milo';
import { resolveCycleTerms } from '@/modules/billing/billing-cycle';
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
import { Plural, Trans } from '@lingui/react/macro';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

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

/** An invoice with its display fields, worked out once per list rather than per cell. */
interface InvoiceRow {
  invoice: Invoice;
  display: PastInvoiceRow;
}

const columnHelper = createColumnHelper<InvoiceRow>();

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
    cell: ({ row }) => <DisplayId value={row.original.invoice.metadata?.name ?? ''} />,
  }),
  columnHelper.display({
    id: 'period',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Period`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap">
        {billingDate(row.original.invoice.spec?.period?.start)} –{' '}
        {billingDate(row.original.invoice.spec?.period?.end)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'issued',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Issued`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap">
        {shortDate(row.original.invoice.metadata?.creationTimestamp)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'due',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Due`} />,
    cell: ({ row }) => {
      const { invoice } = row.original;
      const days = isPastDueInvoice(invoice) ? getDaysOverdue(invoice, now) : 0;
      return (
        <Text
          size="xs"
          className={cn('whitespace-nowrap', days > 0 && 'text-destructive font-medium')}>
          {billingDate(invoice.status?.dueDate)}
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
        {row.original.display.amount}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'status',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
    cell: ({ row }) => {
      const { status, statusLabel } = row.original.display;
      return <BadgeState state={PAST_INVOICE_STATUS_BADGE[status]} message={statusLabel} />;
    },
  }),
  columnHelper.display({
    id: 'download',
    enableSorting: false,
    header: () => <span className="sr-only">{t`Download`}</span>,
    cell: ({ row }) => {
      const url = row.original.invoice.status?.documentUri;
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
  const { invoices, hasMore, isLoading, isError } = useAccountInvoices(orgName, account);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    (): InvoiceRow[] =>
      invoices
        ? sortInvoicesPastDueFirst(invoices).map((invoice) => ({
            invoice,
            display: toPastInvoiceRow(invoice),
          }))
        : [],
    [invoices]
  );
  const summary = useMemo(
    () => (invoices ? summarizeInvoices(invoices, now) : undefined),
    [invoices, now]
  );
  const columns = useMemo(() => buildColumns(now) as ColumnDef<InvoiceRow, unknown>[], [now]);
  const filtered = useMemo(
    () =>
      expanded && search.trim()
        ? sorted.filter(({ display }) => invoiceMatchesSearch(display, search))
        : sorted,
    [sorted, expanded, search]
  );
  const rows = expanded ? filtered : sorted.slice(0, PREVIEW_ROWS);
  const canExpand = sorted.length > PREVIEW_ROWS;

  const terms = account.spec?.paymentTerms;
  const netDays = getEffectiveNetDays(account);
  const count = sorted.length;
  // Some of the org's invoices weren't read, so the count is a floor.
  const invoiceCount = hasMore ? (
    <Trans>{count}+ invoices</Trans>
  ) : (
    <Plural value={count} one="# invoice" other="# invoices" />
  );
  const cycle = resolveCycleTerms(terms);
  const frequency = frequencyLabel(cycle.frequency);
  const invoiceDay = cycle.invoiceDay;
  const subtitle = invoices ? (
    netDays !== undefined ? (
      <Trans>
        {invoiceCount} · net {netDays} · {frequency} on day {invoiceDay}
      </Trans>
    ) : (
      <Trans>
        {invoiceCount} · {frequency} on day {invoiceDay}
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
        <CardQueryState
          isLoading={isLoading}
          isError={isError || (!isLoading && !summary)}
          isEmpty={count === 0}
          skeleton={
            <>
              <AgingSkeleton />
              <div className={TABLE_CARD_FRAME_CLASS}>
                <TableRowsSkeleton />
              </div>
            </>
          }
          error={<Trans>Couldn&apos;t load invoices</Trans>}
          empty={<Trans>No invoices yet</Trans>}>
          {summary ? (
            <AgingSummary aging={summary.aging} currency={getAccountCurrency(account)} />
          ) : null}
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
              <EmptyState size="sm" title={<Trans>No invoices match your search</Trans>} />
            ) : (
              <DataTable.Client
                // Remount when expanding so paging starts from the first page.
                key={expanded ? 'all' : 'preview'}
                data={rows}
                columns={columns}
                pageSize={expanded ? PAGE_SIZE : PREVIEW_ROWS}
                getRowId={(row) => row.invoice.metadata?.name ?? ''}>
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
                  <div className={cn(TABLE_CARD_FOOTER_CLASS, 'px-2 py-1')}>
                    <DataTable.Pagination pageSizes={[10, 25, 50]} />
                  </div>
                ) : null}
              </DataTable.Client>
            )}
          </div>
        </CardQueryState>
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
