import { useAccountInvoices } from '../../hooks';
import {
  chargeAmounts,
  chargeQuantityText,
  chargeStatusText,
  formatChargeAmount,
  formatChargeMoney,
  formatServicePeriod,
  getChargeStatus,
  isChargeRemovable,
  isInvoiceWriterReady,
  sortChargesNewestFirst,
  type Charge,
  type ChargeStatus,
} from '../../lib/charges';
import { getStripeInvoiceNumber, type BillingAccount, type Invoice } from '../../utils';
import { AddChargeDialog } from '../charges/add-charge-dialog';
import {
  BILLING_ACCOUNT_SECTION_IDS,
  CardMessage,
  CardQueryState,
  TableRowsSkeleton,
} from './card-parts';
import { DialogConfirm } from '@/components/dialog';
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
import { useChargeListForAccountQuery, useDeleteChargeMutation } from '@/resources/request/client';
import { createColumnHelper, type ColumnDef } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ChargesCardProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
}

const columnHelper = createColumnHelper<Charge>();

/** The charge's description, with the staff note under it. */
export function ChargeDescription({ charge }: { charge: Charge }) {
  const note = charge.spec.note?.trim();
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Text size="xs" weight="medium" className="break-words">
        {charge.spec.description || charge.spec.servicePricingRef?.name || '—'}
      </Text>
      {note ? (
        <Text size="xs" textColor="muted" className="break-words">
          <span className="font-medium">
            <Trans>Staff only:</Trans>
          </span>{' '}
          {note}
        </Text>
      ) : null}
    </div>
  );
}

/**
 * What the charge comes to after any discount. Billing works it out on the
 * status; until it has, it's worked out here the same way.
 */
export function ChargeAmount({ charge }: { charge: Charge }) {
  const { spec, status } = charge;
  const computed = chargeAmounts(spec.quantity, spec.unitAmount ?? '', spec.discountPercent);
  const amount = status?.amountDue
    ? formatChargeAmount(status.amountDue)
    : computed.ok
      ? formatChargeMoney(computed.amountDue)
      : '—';
  const discount = spec.discountPercent;
  return (
    <div className="flex flex-col items-end">
      <Text size="xs" weight="medium" className="whitespace-nowrap tabular-nums">
        {amount}
      </Text>
      {discount ? (
        <Text size="xs" textColor="muted" className="whitespace-nowrap">
          <Trans>less {discount}%</Trans>
        </Text>
      ) : null}
    </div>
  );
}

/**
 * Where the charge is. An invoiced charge links to its invoice's document,
 * as the invoices card does, or to the invoices card while there isn't one.
 */
export function ChargeStatusText({ status, invoice }: { status: ChargeStatus; invoice?: Invoice }) {
  if (status.kind === 'invoiced' && status.invoiceName) {
    const label = (invoice && getStripeInvoiceNumber(invoice)) || status.invoiceName;
    const documentUri = invoice?.status?.documentUri;
    const link = documentUri ? (
      <a
        href={documentUri}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono underline underline-offset-2">
        {label}
      </a>
    ) : (
      <a
        href={`#${BILLING_ACCOUNT_SECTION_IDS.invoices}`}
        className="font-mono underline underline-offset-2">
        {label}
      </a>
    );
    return (
      <Text size="xs">
        <Trans>Invoiced on {link}</Trans>
      </Text>
    );
  }
  return (
    <Text
      size="xs"
      className={cn(
        status.kind === 'failed' && 'text-destructive',
        status.kind === 'waiting' && 'text-muted-foreground'
      )}>
      {chargeStatusText(status)}
    </Text>
  );
}

const buildColumns = (invoicesByName: Map<string, Invoice>, onRemove: (charge: Charge) => void) => [
  columnHelper.display({
    id: 'charge',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Charge`} />,
    cell: ({ row }) => <ChargeDescription charge={row.original} />,
  }),
  columnHelper.display({
    id: 'quantity',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Qty × price`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap tabular-nums">
        {chargeQuantityText(row.original.spec)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'period',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Supply date`} />,
    cell: ({ row }) => (
      <Text size="xs" className="whitespace-nowrap">
        {formatServicePeriod(row.original.spec.servicePeriod)}
      </Text>
    ),
  }),
  columnHelper.display({
    id: 'amount',
    enableSorting: false,
    header: ({ column }) => (
      <div className="text-right">
        <ListColumnHeader column={column} title={t`Amount`} />
      </div>
    ),
    cell: ({ row }) => <ChargeAmount charge={row.original} />,
  }),
  columnHelper.display({
    id: 'status',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
    cell: ({ row }) => {
      const status = getChargeStatus(row.original);
      return (
        <ChargeStatusText
          status={status}
          invoice={status.kind === 'invoiced' ? invoicesByName.get(status.invoiceName) : undefined}
        />
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    enableSorting: false,
    header: () => <span className="sr-only">{t`Actions`}</span>,
    cell: ({ row }) =>
      isChargeRemovable(row.original) ? (
        <div className="flex justify-end">
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => onRemove(row.original)}>
            <Trans>Remove</Trans>
          </Button>
        </div>
      ) : null,
  }),
];

/**
 * One-off charges staff add to the account, newest first: catalog or
 * custom items billed on the next invoice or straight away. Hidden where
 * the control plane has no charges. Charges can only be added once the
 * account's invoices are written by the invoice writer; existing ones are
 * listed either way.
 */
export function BillingAccountChargesCard({ orgName, account, now }: ChargesCardProps) {
  const accountName = account.metadata?.name ?? '';
  const chargesQuery = useChargeListForAccountQuery(orgName, accountName);
  const deleteCharge = useDeleteChargeMutation(orgName, accountName);
  const { invoices } = useAccountInvoices(orgName, account);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Charge | null>(null);

  const charges = useMemo(
    () => sortChargesNewestFirst(chargesQuery.data?.items ?? []),
    [chargesQuery.data?.items]
  );
  const invoicesByName = useMemo(
    () => new Map((invoices ?? []).map((invoice) => [invoice.metadata?.name ?? '', invoice])),
    [invoices]
  );
  const columns = useMemo(
    () => buildColumns(invoicesByName, setRemoving) as ColumnDef<Charge, unknown>[],
    [invoicesByName]
  );

  if (chargesQuery.data && !chargesQuery.data.served) return null;

  const canAdd = isInvoiceWriterReady(account);
  const count = charges.length;
  const removingName = removing
    ? removing.spec.description || removing.metadata?.name || t`The charge`
    : '';

  return (
    <TableCard
      framed={false}
      contentClassName="flex flex-col gap-3"
      title={<Trans>Charges</Trans>}
      description={
        chargesQuery.data && count > 0 ? (
          <Plural value={count} one="# charge" other="# charges" />
        ) : null
      }
      action={
        canAdd ? (
          <Button
            type="secondary"
            theme="outline"
            size="small"
            icon={<Icon icon={Plus} size={14} />}
            onClick={() => setAdding(true)}>
            <Trans>Add charge</Trans>
          </Button>
        ) : undefined
      }>
      {canAdd ? null : (
        <CardMessage className="py-0">
          <Trans>
            Charges become available when this account&apos;s invoices move to the new invoice
            writer.
          </Trans>
        </CardMessage>
      )}
      <CardQueryState
        isLoading={chargesQuery.isLoading}
        isError={chargesQuery.isError}
        isEmpty={count === 0}
        skeleton={
          <div className={TABLE_CARD_FRAME_CLASS}>
            <TableRowsSkeleton rows={2} />
          </div>
        }
        error={<Trans>Couldn&apos;t load charges</Trans>}
        empty={
          <Trans>No charges. Charges added here go on the account&apos;s next invoice.</Trans>
        }>
        <div className={TABLE_CARD_FRAME_CLASS}>
          <DataTable.Client
            data={charges}
            columns={columns}
            pageSize={10}
            getRowId={(charge) => charge.metadata?.name ?? ''}>
            <DataTable.Content
              headerClassName={LIST_TABLE_HEADER_CLASS}
              headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
              headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
              bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
              rowClassName={LIST_TABLE_ROW_CLASS}
              cellClassName={EMBEDDED_TABLE_CELL_CLASS}
              emptyMessage={t`No charges`}
            />
            {count > 10 ? <DataTable.Pagination /> : null}
          </DataTable.Client>
        </div>
      </CardQueryState>

      {adding ? (
        <AddChargeDialog
          orgName={orgName}
          account={account}
          now={now}
          onClose={() => setAdding(false)}
        />
      ) : null}

      <DialogConfirm
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title={t`Remove charge?`}
        description={
          removing
            ? t`${removingName} comes off the account's next invoice. A charge can't be changed, so to correct one, remove it and add another.`
            : ''
        }
        confirmText={t`Remove charge`}
        cancelText={t`Keep it`}
        variant="destructive"
        onConfirm={async () => {
          if (removing?.metadata?.name) await deleteCharge.mutateAsync(removing.metadata.name);
        }}
      />
    </TableCard>
  );
}
