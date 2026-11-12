import { useAccountInvoices } from '../../hooks';
import {
  CONTRACT_CURRENCY,
  contractBillingDay,
  discountedFeeTotal,
  feeEndsAt,
  getContractFees,
  feeTotal,
  getContractFirstInvoice,
  getContractState,
  offerBillsUsage,
  type ContractState,
} from '../../lib/contract';
import { contractInvoiceSchedule, upcomingInvoices } from '../../lib/contract-schedule';
import {
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  formatMoney,
  getEffectiveNetDays,
  indexServicesByRef,
  PAST_INVOICE_STATUS_BADGE,
  toPastInvoiceRow,
} from '../../utils';
import { billingTimingText, feeChargeText, periodsText } from '../contract-fee-text';
import { ContractScheduleList } from '../contract-schedule-list';
import { BILLING_ACCOUNT_SECTION_IDS, CardMessage, InlineDate, SectionAnchor } from './card-parts';
import { BadgeState } from '@/components/badge';
import { SectionCard } from '@/features/milo';
import {
  useOfferDetailQuery,
  usePreviewNextInvoiceMutation,
  useServiceListQuery,
  useServicePricingListQuery,
  type InvoiceRequest,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { FileSearch, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/** A date as fee details show it, e.g. "Feb 12, 2027" (UTC). */
const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface ContractCardProps {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null;
  now: Date;
}

/**
 * A negotiated contract on the account: its fees, when it starts and bills,
 * and a preview of the next invoice. Hidden for accounts without a contract,
 * which the header's Actions menu can set one up for.
 */
export function BillingAccountContractCard({
  orgName,
  account,
  entitlement,
  now,
}: ContractCardProps) {
  const accountName = account.metadata?.name ?? '';
  const contract = getContractState(entitlement, now);
  const offerQuery = useOfferDetailQuery(entitlement?.spec?.offerRef?.name ?? '');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      {contract ? (
        <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.contract}>
          <SectionCard
            title={<Trans>Contract</Trans>}
            action={
              <LinkButton
                type="quaternary"
                theme="borderless"
                size="small"
                href={billingAccountRoutes.contract(orgName, accountName)}
                icon={<Icon icon={Pencil} size={14} />}
                iconPosition="right">
                <Trans>Change fees</Trans>
              </LinkButton>
            }>
            <div className="flex flex-col gap-3">
              <ContractDates contract={contract} />
              {offerQuery.isLoading ? (
                <Skeleton className="h-10 w-full rounded" />
              ) : offerQuery.data ? (
                <>
                  <ContractFees offer={offerQuery.data} startsAt={contract.startsAt} />
                  <div className="border-t pt-3">
                    <ContractScheduleList
                      upcoming={upcomingInvoices(
                        contractInvoiceSchedule({
                          startsAt: contract.startsAt,
                          fees: getContractFees(offerQuery.data),
                          billsUsage: offerBillsUsage(offerQuery.data),
                          netDays: getEffectiveNetDays(account),
                        }),
                        now
                      )}
                    />
                  </div>
                </>
              ) : (
                <CardMessage className="py-0">
                  <Trans>Couldn&apos;t load the contract&apos;s offer.</Trans>
                </CardMessage>
              )}
              <div className="border-t pt-3">
                <Button
                  type="secondary"
                  theme="outline"
                  size="small"
                  onClick={() => setPreviewOpen(true)}
                  icon={<Icon icon={FileSearch} size={14} />}>
                  {contract.started ? (
                    <Trans>Preview next invoice</Trans>
                  ) : (
                    <Trans>Preview first invoice</Trans>
                  )}
                </Button>
              </div>
            </div>
          </SectionCard>
        </SectionAnchor>
      ) : null}

      {previewOpen ? (
        <InvoicePreviewDialog
          orgName={orgName}
          account={account}
          firstInvoice={contract ? !contract.started : false}
          startedAt={contract?.started ? contract.startsAt : undefined}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

function BillingDay({ startsAt }: { startsAt: Date }) {
  const day = contractBillingDay(startsAt);
  return day > 28 ? (
    <Trans>Bills on day {day} of each month, or the last day of shorter months.</Trans>
  ) : (
    <Trans>Bills on day {day} of each month.</Trans>
  );
}

function ContractDates({ contract }: { contract: ContractState }) {
  const start = contract.startsAt.toISOString();
  return (
    <div className="flex flex-col gap-1">
      <Text size="sm" weight="medium">
        {contract.started ? (
          <Trans>
            Started <InlineDate date={start} variant="absolute" format="MMM d, yyyy" />
          </Trans>
        ) : (
          <Trans>
            Starts <InlineDate date={start} variant="absolute" format="MMM d, yyyy" />
          </Trans>
        )}
      </Text>
      <Text size="xs" textColor="muted">
        <BillingDay startsAt={contract.startsAt} />
        {contract.started ? null : (
          <>
            {' '}
            <Trans>Until then the account is billed as before.</Trans>
          </>
        )}
      </Text>
      {contract.changeAt ? (
        <Text size="xs" textColor="warning">
          <Trans>
            New fees take effect on{' '}
            <InlineDate
              date={contract.changeAt.toISOString()}
              variant="absolute"
              format="MMM d, yyyy"
            />
            , the next billing date.
          </Trans>
        </Text>
      ) : null}
    </div>
  );
}

/** How many fees the contract and draft cards show before "Show all". */
const FEES_SHOWN = 5;

/** A fee's quantity and unit price, e.g. "4 port × $300.00", or null for one of it. */
const feeQuantityText = (fee: { amount: number; quantity: number; pricingUnit?: string }) => {
  const unitPrice = formatMoney(fee.amount, CONTRACT_CURRENCY);
  if (fee.pricingUnit) return `${fee.quantity} ${fee.pricingUnit} × ${unitPrice}`;
  return fee.quantity > 1 ? `${fee.quantity} × ${unitPrice}` : null;
};

/**
 * The offer's fees, each with what it charges and how often. `startsAt`, the
 * contract's start, says when a fee with renewals ends.
 */
export function ContractFees({
  offer,
  startsAt,
}: {
  offer: ComMiloapisBillingV1Alpha1Offer;
  startsAt?: Date;
}) {
  const fees = getContractFees(offer);
  // A long contract shows its first fees, with the rest a click away.
  const [showAll, setShowAll] = useState(false);
  const shownFees = showAll ? fees : fees.slice(0, FEES_SHOWN);
  const discount = offer.spec?.discount?.percentage;
  const customRates = (offer.spec?.servicePricings ?? []).filter(
    (snapshot) => snapshot.spec?.chargeType === 'Usage' && snapshot.spec.basedOn
  ).length;
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );
  // A customer's own fee is shown with the list fee's amount beside it.
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  const listAmountByName = useMemo(
    () =>
      new Map(
        (pricingsQuery.data?.items ?? []).map((p) => [
          p.metadata?.name ?? '',
          Number.parseFloat(p.spec?.amount ?? ''),
        ])
      ),
    [pricingsQuery.data?.items]
  );
  return (
    <div className="flex flex-col gap-1.5">
      {fees.length === 0 ? (
        <Text size="sm" textColor="muted">
          <Trans>This offer has no fixed fees.</Trans>
        </Text>
      ) : (
        <ul className="flex flex-col gap-1">
          {shownFees.map((fee) => {
            // What the customer pays, after any discount; the full amount is
            // shown with the discount underneath.
            const total = formatMoney(discountedFeeTotal(fee), CONTRACT_CURRENCY);
            const listAmount = fee.basedOn ? listAmountByName.get(fee.basedOn) : undefined;
            const beforeDiscount = formatMoney(feeTotal(fee), CONTRACT_CURRENCY);
            const detail = [
              feeQuantityText(fee),
              listAmount !== undefined && !Number.isNaN(listAmount)
                ? t`list ${formatMoney(listAmount, CONTRACT_CURRENCY)}`
                : null,
              fee.discount ? t`${fee.discount}% off ${beforeDiscount}` : null,
              fee.billingTiming ? billingTimingText(fee.billingTiming) : null,
              fee.periods ? periodsText(fee.periods, fee.interval) : null,
              fee.periods && startsAt
                ? t`until ${formatDate(feeEndsAt(startsAt, fee.interval, fee.periods))}`
                : null,
              fee.serviceRef
                ? servicesByRef.get(fee.serviceRef)?.spec?.displayName || fee.serviceRef
                : null,
            ].filter(Boolean);
            return (
              <li key={fee.name} className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <Text size="sm" className="truncate">
                    {fee.label}
                  </Text>
                  {detail.length > 0 ? (
                    <Text size="xs" textColor="muted" className="truncate">
                      {detail.join(' · ')}
                    </Text>
                  ) : null}
                </div>
                <Text size="sm" className="shrink-0 tabular-nums">
                  {feeChargeText(total, fee)}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
      {fees.length > FEES_SHOWN ? (
        <div>
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            htmlType="button"
            className="-ml-2"
            onClick={() => setShowAll((value) => !value)}>
            {showAll ? <Trans>Show fewer</Trans> : <Trans>Show all {fees.length} fees</Trans>}
          </Button>
        </div>
      ) : null}
      <Text size="xs" textColor="muted">
        {!offerBillsUsage(offer) ? (
          <Trans>Fixed fees only: usage isn&apos;t billed.</Trans>
        ) : customRates > 0 ? (
          <Plural
            value={customRates}
            one="Plus usage, at the customer's own rates for # meter."
            other="Plus usage, at the customer's own rates for # meters."
          />
        ) : (
          <Trans>Plus usage.</Trans>
        )}
        {discount ? (
          <>
            {' '}
            <Trans>{discount}% off.</Trans>
          </>
        ) : null}
      </Text>
    </div>
  );
}

/**
 * Asks the invoicing provider for the account's next invoice, and shows its
 * lines. Before a contract starts, that's the contract's first invoice.
 */
function InvoicePreviewDialog({
  orgName,
  account,
  firstInvoice,
  startedAt,
  onClose,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  firstInvoice: boolean;
  /** When the contract started, once it has: its first invoice is shown too. */
  startedAt?: Date;
  onClose: () => void;
}) {
  const preview = usePreviewNextInvoiceMutation(orgName, account.metadata?.name ?? '');
  const { mutate } = preview;
  useEffect(() => {
    mutate();
  }, [mutate]);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header
          title={firstInvoice ? t`First invoice preview` : t`Next invoice preview`}
          description={t`Worked out by the billing provider. Nothing is sent to the customer.`}
        />
        <Dialog.Body className="px-5">
          {preview.isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-1/2 rounded" />
            </div>
          ) : preview.isError ? (
            <Text size="sm" textColor="muted">
              {preview.error instanceof Error
                ? preview.error.message
                : t`Couldn't preview the invoice.`}
            </Text>
          ) : preview.data ? (
            <PreviewResult request={preview.data} />
          ) : null}
          {startedAt ? (
            <ContractFirstInvoice orgName={orgName} account={account} startedAt={startedAt} />
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="quaternary" theme="borderless" onClick={onClose}>
            <Trans>Close</Trans>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

/**
 * The invoice the contract's first charges went on. OpenMeter invoices a
 * contract's setup fees and first month as it starts, so after the start the
 * preview only shows what comes next.
 */
function ContractFirstInvoice({
  orgName,
  account,
  startedAt,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  startedAt: Date;
}) {
  const { invoices, isLoading } = useAccountInvoices(orgName, account);
  const first = invoices ? getContractFirstInvoice(invoices, startedAt) : undefined;
  const row = first ? toPastInvoiceRow(first) : null;
  const documentUri = first?.status?.documentUri;

  return (
    <div className="mt-4 flex flex-col gap-1 border-t pt-3">
      <Text size="xs" textColor="muted">
        <Trans>Already invoiced</Trans>
      </Text>
      {isLoading ? (
        <Skeleton className="h-5 w-full rounded" />
      ) : row ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <Text size="sm" className="truncate">
              <Trans>First invoice</Trans>
            </Text>
            <Text size="xs" textColor="muted" className="truncate font-mono">
              {row.invoiceNumber}
            </Text>
            {first?.metadata?.creationTimestamp ? (
              <Text size="xs" textColor="muted">
                <Trans>
                  Issued{' '}
                  <InlineDate
                    date={first.metadata.creationTimestamp}
                    variant="absolute"
                    format="MMM d, yyyy"
                  />
                </Trans>
              </Text>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <BadgeState state={PAST_INVOICE_STATUS_BADGE[row.status]} message={row.statusLabel} />
            <Text size="sm" className="tabular-nums">
              {row.amount}
            </Text>
            {documentUri ? (
              <Button
                type="quaternary"
                theme="borderless"
                size="small"
                onClick={() => window.open(documentUri, '_blank', 'noopener,noreferrer')}>
                <Trans>Open</Trans>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Text size="sm" textColor="muted">
          <Trans>
            The first invoice hasn&apos;t come through yet. OpenMeter sends it a few minutes after
            the contract starts.
          </Trans>
        </Text>
      )}
    </div>
  );
}

function PreviewResult({ request }: { request: InvoiceRequest }) {
  const status = request.status;
  const completed = status?.conditions?.find((condition) => condition.type === 'Completed');
  const currency = status?.currencyCode || CONTRACT_CURRENCY;
  const lines = status?.lines ?? [];

  if (status?.phase === 'Failed' || lines.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        {completed?.message || t`There's nothing to invoice yet.`}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-border flex flex-col divide-y">
        {lines.map((line, index) => (
          <li
            key={`${line.description}-${index}`}
            className="flex items-baseline justify-between gap-3 py-1.5">
            <div className="flex min-w-0 flex-col">
              <Text size="sm" className="truncate">
                {line.description}
              </Text>
              {line.period ? (
                <Text size="xs" textColor="muted">
                  <InlineDate date={line.period.start} variant="absolute" format="MMM d, yyyy" />
                  {' – '}
                  <InlineDate date={line.period.end} variant="absolute" format="MMM d, yyyy" />
                </Text>
              ) : null}
            </div>
            <Text size="sm" className="shrink-0 tabular-nums">
              {formatMoney(Number.parseFloat(line.amount), currency)}
            </Text>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-3 border-t pt-2">
        <Text size="sm" weight="medium">
          <Trans>Total before tax</Trans>
        </Text>
        <Text size="sm" weight="medium" className="tabular-nums">
          {formatMoney(Number.parseFloat(status?.total ?? '0'), currency)}
        </Text>
      </div>
      {completed?.message ? (
        <Text size="xs" textColor="muted">
          {completed.message}
        </Text>
      ) : null}
    </div>
  );
}
