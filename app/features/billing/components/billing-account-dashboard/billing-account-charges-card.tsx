import { useAccountInvoices } from '../../hooks';
import {
  chargeAmounts,
  chargeDraftTotal,
  chargeQuantityText,
  chargeRemovalNote,
  chargeRemovalText,
  chargeStatusText,
  formatChargeAmount,
  formatChargeMoney,
  formatServicePeriod,
  getChargeStatus,
  isChargeRemovable,
  isInvoiceWriterReady,
  sortChargesNewestFirst,
  type Charge,
  type ChargeDraft,
  type ChargeStatus,
} from '../../lib/charges';
import { getStripeInvoiceNumber, type BillingAccount, type Invoice } from '../../utils';
import { AddChargeDialog } from '../charges/add-charge-dialog';
import { InvoicePreviewDialog } from './billing-account-contract-card';
import {
  BILLING_ACCOUNT_SECTION_IDS,
  CardMessage,
  CardQueryState,
  InlineDate,
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
import {
  useChargeDraftListForAccountQuery,
  useChargeListForAccountQuery,
  useDeleteChargeDraftMutation,
  useDeleteChargeMutation,
} from '@/resources/request/client';
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
      const removalNote = chargeRemovalNote(row.original);
      return (
        <div className="flex flex-col gap-0.5">
          <ChargeStatusText
            status={status}
            invoice={
              status.kind === 'invoiced' ? invoicesByName.get(status.invoiceName) : undefined
            }
          />
          {removalNote ? (
            <Text size="xs" className="text-muted-foreground">
              {removalNote}
            </Text>
          ) : null}
        </div>
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
 * A saved charge draft: its lines, what they come to before tax and when
 * they'd be invoiced, with ways to change, preview, add or discard it.
 */
function ChargeDraftRow({
  draft,
  onEdit,
  onPreview,
  onDiscard,
}: {
  draft: ChargeDraft;
  onEdit: () => void;
  onPreview: () => void;
  onDiscard: () => void;
}) {
  const lines = draft.spec.lines;
  const total = chargeDraftTotal(draft);
  const descriptions = lines
    .map((line) => line.description || line.servicePricingRef?.name || '—')
    .join(', ');
  const created = draft.metadata?.creationTimestamp;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-dashed px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="xs" weight="medium">
          <Plural value={lines.length} one="Draft of # line" other="Draft of # lines" />
          {total !== null ? <> · {formatChargeMoney(total)}</> : null}
          {' · '}
          {draft.spec.invoice === 'Now' ? (
            <Trans>invoiced on its own</Trans>
          ) : (
            <Trans>on the next invoice</Trans>
          )}
        </Text>
        <Text size="xs" textColor="muted" className="break-words">
          {descriptions}
        </Text>
        {created ? (
          <Text size="xs" textColor="muted">
            <Trans>
              Saved{' '}
              <InlineDate date={created} variant="absolute" format="MMM d, yyyy" timezone="UTC" />
            </Trans>
          </Text>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="quaternary" theme="borderless" size="small" onClick={onPreview}>
          <Trans>Preview</Trans>
        </Button>
        <Button type="quaternary" theme="borderless" size="small" onClick={onEdit}>
          <Trans>Edit or add</Trans>
        </Button>
        <Button type="quaternary" theme="borderless" size="small" onClick={onDiscard}>
          <Trans>Discard</Trans>
        </Button>
      </div>
    </div>
  );
}

/**
 * One-off charges staff add to the account, newest first: catalog or
 * custom items billed on the next invoice or straight away. Nothing shows
 * until billing has said whether it serves charges, and nothing at all
 * where it doesn't, so the page doesn't jump. Charges can only be added
 * once the account's invoices are written by the invoice writer; existing
 * ones are listed either way.
 */
export function BillingAccountChargesCard({ orgName, account }: ChargesCardProps) {
  const accountName = account.metadata?.name ?? '';
  const chargesQuery = useChargeListForAccountQuery(orgName, accountName);
  const deleteCharge = useDeleteChargeMutation(orgName, accountName);
  const draftsQuery = useChargeDraftListForAccountQuery(orgName, accountName);
  const deleteDraft = useDeleteChargeDraftMutation(orgName, accountName);
  const { invoices } = useAccountInvoices(orgName, account);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Charge | null>(null);
  const [editingDraft, setEditingDraft] = useState<ChargeDraft | null>(null);
  const [previewingDraft, setPreviewingDraft] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<ChargeDraft | null>(null);
  const drafts = draftsQuery.data?.items ?? [];
  const draftsServed = draftsQuery.data?.served ?? false;

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

  // Until the list answers, it isn't known whether charges are served. A
  // failure other than a 404 means they are, and shows on the card.
  const served = chargesQuery.data ? chargesQuery.data.served : chargesQuery.isError;
  if (!served) return null;

  const canAdd = isInvoiceWriterReady(account);
  const count = charges.length;

  return (
    <TableCard
      framed={false}
      contentClassName="flex flex-col gap-3"
      title={<Trans>Charges</Trans>}
      description={
        <Trans>
          One-off items billed once, outside the account&apos;s plan or contract: an install, remote
          hands, a correction. Anything billed every period belongs in a contract instead.
        </Trans>
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
      {chargesQuery.data?.hasMore ? (
        <CardMessage className="py-0">
          <Trans>
            The organization has too many charges to read them all, so some of this account&apos;s
            may be missing.
          </Trans>
        </CardMessage>
      ) : null}
      {canAdd ? null : (
        <CardMessage className="py-0">
          <Trans>
            Charges become available when this account&apos;s invoices move to the new invoice
            writer.
          </Trans>
        </CardMessage>
      )}
      {canAdd && drafts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <ChargeDraftRow
              key={draft.metadata?.name}
              draft={draft}
              onEdit={() => setEditingDraft(draft)}
              onPreview={() => setPreviewingDraft(draft.metadata?.name ?? null)}
              onDiscard={() => setDiscarding(draft)}
            />
          ))}
        </div>
      ) : null}
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
          <Trans>
            No charges yet. A charge goes on the account&apos;s next invoice, or on an invoice of
            its own straight away.
          </Trans>
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
          canSaveDraft={draftsServed}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editingDraft ? (
        <AddChargeDialog
          orgName={orgName}
          account={account}
          draft={editingDraft}
          canSaveDraft
          onClose={() => setEditingDraft(null)}
        />
      ) : null}
      {previewingDraft ? (
        <InvoicePreviewDialog
          orgName={orgName}
          account={account}
          firstInvoice={false}
          chargeDraft={previewingDraft}
          onClose={() => setPreviewingDraft(null)}
        />
      ) : null}
      <DialogConfirm
        open={discarding !== null}
        onOpenChange={(open) => (open ? undefined : setDiscarding(null))}
        title={t`Discard draft?`}
        description={t`Its lines are deleted. Nothing was added or invoiced from it.`}
        confirmText={t`Discard draft`}
        cancelText={t`Keep it`}
        variant="destructive"
        onConfirm={async () => {
          if (discarding?.metadata?.name) await deleteDraft.mutateAsync(discarding.metadata.name);
        }}
      />

      <DialogConfirm
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title={t`Remove charge?`}
        description={
          removing
            ? `${chargeRemovalText(removing)} ${t`A charge can't be changed, so to correct one, remove it and add another.`}`
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
