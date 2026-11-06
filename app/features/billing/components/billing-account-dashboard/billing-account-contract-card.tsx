import { useAccountInvoices } from '../../hooks';
import {
  contractBillingDay,
  contractStartFromDate,
  contractStartProblem,
  firstInvoiceTotal,
  firstMonthShare,
  getContractFees,
  feeTotal,
  getContractFirstInvoice,
  getContractState,
  localDateForUtcDay,
  MAX_CONTRACT_FEES,
  MAX_CONTRACT_LEAD_DAYS,
  monthlyTotal,
  offerBillsUsage,
  parseAmount,
  proratedFirstInvoiceTotal,
  startOfUtcDay,
  toPricingAmount,
  type ContractFee,
  type ContractState,
} from '../../lib/contract';
import {
  buildListFeePlan,
  listFeeNames,
  listFeeOptions,
  listFeeRowAmount,
  listFeeRowsFromOffer,
  type ListFeeOption,
} from '../../lib/contract-list-fees';
import {
  buildUsagePlan,
  listUsageMeterOptions,
  RATE_AMOUNT_PATTERN,
  rateSlots,
  usageRowsFromOffer,
  type UsageMeterOption,
} from '../../lib/contract-usage';
import {
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  formatMoney,
  getBillingAccountDisplayName,
  indexServicesByRef,
  PAST_INVOICE_STATUS_BADGE,
  toPastInvoiceRow,
} from '../../utils';
import { BILLING_ACCOUNT_SECTION_IDS, CardMessage, InlineDate, SectionAnchor } from './card-parts';
import { BadgeState } from '@/components/badge';
import { DialogForm } from '@/components/dialog';
import { SectionCard } from '@/features/milo';
import {
  useBillingDefaultOfferQuery,
  useChangeContractFeesMutation,
  useOfferDetailQuery,
  usePreviewNextInvoiceMutation,
  useServiceListQuery,
  useServicePricingListQuery,
  useSetUpContractMutation,
  type InvoiceRequest,
  type ServicePricing,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { DatePicker } from '@datum-cloud/datum-ui/picker';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { FileSearch, Pencil, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFormState, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

/** Contract fees are USD only, like every ServicePricing. */
const CONTRACT_CURRENCY = 'USD';

/** The service picker's value for a fee that isn't for any one service. */
const NO_SERVICE = 'none';

/** Most of one fee a contract can charge, as billing allows. */
const MAX_FEE_QUANTITY = 10000;

export type ContractDialogMode = 'setup' | 'change';

interface ContractCardProps {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null;
  now: Date;
  /** The setup/change dialog, held by the page so its header can open it too. */
  dialogMode: ContractDialogMode | null;
  onDialogModeChange: (mode: ContractDialogMode | null) => void;
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
  dialogMode,
  onDialogModeChange,
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
              <Button
                type="quaternary"
                theme="borderless"
                size="small"
                onClick={() => onDialogModeChange('change')}
                icon={<Icon icon={Pencil} size={14} />}
                iconPosition="right">
                <Trans>Change fees</Trans>
              </Button>
            }>
            <div className="flex flex-col gap-3">
              <ContractDates contract={contract} />
              {offerQuery.isLoading ? (
                <Skeleton className="h-10 w-full rounded" />
              ) : offerQuery.data ? (
                <ContractFees offer={offerQuery.data} />
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

      {entitlement ? (
        <ContractDialog
          key={dialogMode ?? 'closed'}
          orgName={orgName}
          account={account}
          entitlement={entitlement}
          contract={contract}
          currentOffer={offerQuery.data ?? null}
          mode={dialogMode}
          now={now}
          onOpenChange={(open) => {
            if (!open) onDialogModeChange(null);
          }}
        />
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

/** A fee's quantity and unit price, e.g. "4 port × $300.00", or null for one of it. */
const feeQuantityText = (fee: { amount: number; quantity: number; pricingUnit?: string }) => {
  const unitPrice = formatMoney(fee.amount, CONTRACT_CURRENCY);
  if (fee.pricingUnit) return `${fee.quantity} ${fee.pricingUnit} × ${unitPrice}`;
  return fee.quantity > 1 ? `${fee.quantity} × ${unitPrice}` : null;
};

function ContractFees({ offer }: { offer: ComMiloapisBillingV1Alpha1Offer }) {
  const fees = getContractFees(offer);
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
          {fees.map((fee) => {
            const total = formatMoney(feeTotal(fee), CONTRACT_CURRENCY);
            const listAmount = fee.basedOn ? listAmountByName.get(fee.basedOn) : undefined;
            const detail = [
              feeQuantityText(fee),
              listAmount !== undefined && !Number.isNaN(listAmount)
                ? t`list ${formatMoney(listAmount, CONTRACT_CURRENCY)}`
                : null,
              fee.discount ? t`${fee.discount}% off` : null,
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
                  {fee.chargeType === 'OneTime' ? (
                    <Trans>{total} once</Trans>
                  ) : (
                    <Trans>{total} / month</Trans>
                  )}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
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

const usageRowSchema = z.object({
  metric: z.string(),
  selected: z.boolean(),
  pricingName: z.string(),
  discount: z.string(),
  custom: z.boolean(),
  amounts: z.array(z.string()),
  currentPricing: z.string().optional(),
});

const listFeeRowSchema = z.object({
  name: z.string(),
  selected: z.boolean(),
  quantity: z.string(),
  discount: z.string(),
  custom: z.boolean(),
  amount: z.string(),
  currentPricing: z.string().optional(),
});

const isFeeQuantity = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_FEE_QUANTITY;
};

const DISCOUNT_PATTERN = /^(100|[1-9]?\d)$/;

const buildContractSchema = (needsStart: boolean, allowOneTime: boolean, now: Date) =>
  z
    .object({
      fees: z
        .array(
          z.object({
            label: z
              .string()
              .trim()
              .min(1, t`Name the fee, as invoices show it.`),
            chargeType: z.enum(['OneTime', 'Recurring']),
            amount: z.string().refine((value) => parseAmount(value) > 0, {
              message: t`Enter an amount, such as 1000 or 1000.00.`,
            }),
            quantity: z.string().refine(isFeeQuantity, {
              message: t`A whole number from 1 to ${MAX_FEE_QUANTITY}.`,
            }),
            pricingUnit: z
              .string()
              .trim()
              .max(64, t`Keep the unit short, such as port or kW.`),
            serviceRef: z.string(),
            existingPricing: z.string().optional(),
          })
        )
        .max(MAX_CONTRACT_FEES, t`A contract can have at most ${MAX_CONTRACT_FEES} fees.`),
      fromPriceList: z.boolean(),
      usage: z.array(usageRowSchema),
      listFees: z.array(listFeeRowSchema),
      startsAt: z.date().optional(),
    })
    .superRefine((values, ctx) => {
      if (!allowOneTime) {
        values.fees.forEach((fee, index) => {
          if (fee.chargeType === 'OneTime') {
            ctx.addIssue({
              code: 'custom',
              path: ['fees', index, 'chargeType'],
              message: t`The contract has started, so a one-time fee would be charged again.`,
            });
          }
        });
      }
      const listFees = values.fromPriceList ? values.listFees.filter((row) => row.selected) : [];
      if (values.fees.length + listFees.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['fees'],
          message: t`Add a fee, or pick one from the price list.`,
        });
      }
      if (values.fees.length + listFees.length > MAX_CONTRACT_FEES) {
        ctx.addIssue({
          code: 'custom',
          path: ['fees'],
          message: t`A contract can have at most ${MAX_CONTRACT_FEES} fees, counting those from the price list.`,
        });
      }
      if (values.fromPriceList) {
        if (!values.usage.some((row) => row.selected) && listFees.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['fromPriceList'],
            message: t`Pick what the contract bills from the price list, or turn this off.`,
          });
        }
        values.listFees.forEach((row, index) => {
          if (!row.selected) return;
          if (!isFeeQuantity(row.quantity.trim())) {
            ctx.addIssue({
              code: 'custom',
              path: ['listFees', index, 'quantity'],
              message: t`A whole number from 1 to ${MAX_FEE_QUANTITY}.`,
            });
          }
          const discount = row.discount.trim();
          if (discount && !DISCOUNT_PATTERN.test(discount)) {
            ctx.addIssue({
              code: 'custom',
              path: ['listFees', index, 'discount'],
              message: t`A whole percentage from 0 to 100.`,
            });
          }
          if (row.custom && !(parseAmount(row.amount) > 0)) {
            ctx.addIssue({
              code: 'custom',
              path: ['listFees', index, 'amount'],
              message: t`Enter an amount, such as 1000 or 1000.00.`,
            });
          }
        });
        values.usage.forEach((row, index) => {
          if (!row.selected) return;
          const discount = row.discount.trim();
          if (discount && !DISCOUNT_PATTERN.test(discount)) {
            ctx.addIssue({
              code: 'custom',
              path: ['usage', index, 'discount'],
              message: t`A whole percentage from 0 to 100.`,
            });
          }
          if (!row.custom) return;
          row.amounts.forEach((amount, slot) => {
            if (!RATE_AMOUNT_PATTERN.test(amount.trim())) {
              ctx.addIssue({
                code: 'custom',
                path: ['usage', index, 'amounts', slot],
                message: t`Enter a rate, such as 0.000012.`,
              });
            }
          });
        });
      }
      if (!needsStart) return;
      if (!values.startsAt) {
        ctx.addIssue({ code: 'custom', path: ['startsAt'], message: t`Pick a start date.` });
        return;
      }
      const problem = contractStartProblem(contractStartFromDate(values.startsAt), now);
      if (problem) {
        ctx.addIssue({
          code: 'custom',
          path: ['startsAt'],
          message:
            problem === 'past'
              ? t`A contract can't start in the past: charges can't be backdated.`
              : t`A contract can start at most ${MAX_CONTRACT_LEAD_DAYS} days ahead.`,
        });
      }
    });

type ContractFormValues = z.infer<ReturnType<typeof buildContractSchema>>;
type ContractFeeRow = ContractFormValues['fees'][number];
type ServiceOption = { serviceName: string; label: string };

/** RFC 3339 at second precision, as Kubernetes writes times. */
const toRfc3339 = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Whether a fee row still charges exactly what an existing pricing does. */
const sameFeePricing = (row: ContractFeeRow, fee: ContractFee) =>
  row.label.trim() === fee.label &&
  row.chargeType === fee.chargeType &&
  parseAmount(row.amount) === fee.amount &&
  row.pricingUnit.trim() === (fee.pricingUnit ?? '') &&
  (row.serviceRef === NO_SERVICE ? '' : row.serviceRef) === (fee.serviceRef ?? '');

function ContractDialog(props: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  mode: ContractDialogMode | null;
  now: Date;
  onOpenChange: (open: boolean) => void;
}) {
  const isSetup = props.mode === 'setup';
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  const defaultOfferName = useBillingDefaultOfferQuery().data ?? '';
  const defaultOfferQuery = useOfferDetailQuery(isSetup ? defaultOfferName : '');
  // The form's usage rows start from the pricings and, for a new contract,
  // the default offer's selection, so it waits for them.
  const loading =
    pricingsQuery.isLoading || (isSetup && (!defaultOfferName || defaultOfferQuery.isLoading));

  if (props.mode !== null && loading) {
    return (
      <Dialog open onOpenChange={props.onOpenChange}>
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header title={isSetup ? t`Set up contract` : t`Change contract fees`} />
          <Dialog.Body className="flex flex-col gap-2 px-5 pb-5" aria-busy="true">
            <Skeleton className="h-24 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );
  }
  return (
    <ContractDialogForm
      {...props}
      pricings={pricingsQuery.data?.items ?? []}
      defaultOffer={defaultOfferQuery.data ?? null}
    />
  );
}

function ContractDialogForm({
  orgName,
  account,
  entitlement,
  contract,
  currentOffer,
  mode,
  now,
  onOpenChange,
  pricings,
  defaultOffer,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  mode: ContractDialogMode | null;
  now: Date;
  onOpenChange: (open: boolean) => void;
  pricings: ServicePricing[];
  defaultOffer: ComMiloapisBillingV1Alpha1Offer | null;
}) {
  const accountName = account.metadata?.name ?? '';
  const entitlementName = entitlement.metadata?.name ?? '';
  const setUp = useSetUpContractMutation(orgName, accountName);
  const changeFees = useChangeContractFeesMutation(orgName, accountName);
  const servicesQuery = useServiceListQuery();

  const isSetup = mode === 'setup';
  // A one-time fee is charged whenever the account moves onto an Offer that
  // has one, so a contract that has started is amended without them.
  const allowOneTime = isSetup || !contract?.started;

  const usageOptions = useMemo(() => listUsageMeterOptions(pricings), [pricings]);
  // A started contract is amended without one-time fees, list ones included.
  const feeOptions = useMemo(
    () =>
      listFeeOptions(pricings).filter(
        (option) => allowOneTime || option.chargeType === 'Recurring'
      ),
    [pricings, allowOneTime]
  );

  const services = useMemo<ServiceOption[]>(
    () =>
      (servicesQuery.data?.items ?? [])
        .filter((service) => service.spec?.serviceName)
        .map((service) => ({
          serviceName: service.spec?.serviceName ?? '',
          label: `${service.spec?.displayName || service.metadata?.name} (${service.spec?.serviceName})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [servicesQuery.data?.items]
  );

  // Fees from the price list, and customer fees based on them, are the
  // price list's rows; the rest are the contract's own.
  const listedFees = listFeeNames(feeOptions, currentOffer);
  const currentFees = getContractFees(currentOffer).filter(
    (fee) => (allowOneTime || fee.chargeType === 'Recurring') && !listedFees.has(fee.name)
  );
  const currentFeeByName = new Map(currentFees.map((fee) => [fee.name, fee]));
  const blankFee = (chargeType: ContractFeeRow['chargeType'], label = ''): ContractFeeRow => ({
    label,
    chargeType,
    amount: '',
    quantity: '1',
    pricingUnit: '',
    serviceRef: NO_SERVICE,
  });
  const usageFrom = isSetup ? defaultOffer : currentOffer;
  const usageRows = usageRowsFromOffer(usageOptions, usageFrom);
  const listFeeRows = listFeeRowsFromOffer(feeOptions, usageFrom);
  const pickedFromList =
    usageRows.some((row) => row.selected) || listFeeRows.some((row) => row.selected);

  const defaultFees: ContractFeeRow[] =
    !isSetup && (currentFees.length > 0 || pickedFromList)
      ? currentFees.map((fee) => ({
          label: fee.label,
          chargeType: fee.chargeType,
          amount: toPricingAmount(fee.amount),
          quantity: String(fee.quantity),
          pricingUnit: fee.pricingUnit ?? '',
          serviceRef: fee.serviceRef ?? NO_SERVICE,
          existingPricing: fee.name,
        }))
      : allowOneTime
        ? [blankFee('OneTime', t`Setup fee`), blankFee('Recurring', t`Monthly fee`)]
        : [blankFee('Recurring', t`Monthly fee`)];

  const schema = useMemo(
    () => buildContractSchema(isSetup, allowOneTime, now),
    [isSetup, allowOneTime, now]
  );
  const defaultValues: ContractFormValues = {
    fees: defaultFees,
    fromPriceList: pickedFromList,
    usage: usageRows,
    listFees: listFeeRows,
    startsAt: undefined,
  };

  const handleSubmit = async (values: ContractFormValues) => {
    const offer = {
      orgName,
      accountName,
      displayName: t`${getBillingAccountDisplayName(account)} contract`,
      fees: [
        ...values.fees.map((fee) => {
          const existing = fee.existingPricing
            ? currentFeeByName.get(fee.existingPricing)
            : undefined;
          return {
            label: fee.label.trim(),
            chargeType: fee.chargeType,
            amount: toPricingAmount(parseAmount(fee.amount)),
            quantity: Number(fee.quantity),
            pricingUnit: fee.pricingUnit.trim() || undefined,
            serviceRef: fee.serviceRef === NO_SERVICE ? undefined : fee.serviceRef,
            existingPricing: existing && sameFeePricing(fee, existing) ? existing.name : undefined,
          };
        }),
        ...(values.fromPriceList
          ? buildListFeePlan(values.listFees, feeOptions, currentOffer)
          : []),
      ],
      usage: values.fromPriceList
        ? buildUsagePlan(
            values.usage,
            usageOptions,
            DEFAULT_SERVICE_PRICING_NAMESPACE,
            currentOffer
          )
        : { refs: [], create: [] },
    };
    try {
      if (isSetup) {
        await setUp.mutateAsync({
          entitlementName,
          startsAt: toRfc3339(contractStartFromDate(values.startsAt as Date)),
          offer,
        });
        toast.success(t`Contract set up`);
      } else {
        await changeFees.mutateAsync({ entitlementName, offer });
        toast.success(t`Contract fees changed`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to save the contract`);
      throw err; // keep the dialog open
    }
  };

  const title = isSetup ? t`Set up contract` : t`Change contract fees`;
  const description = isSetup
    ? t`Bill this account negotiated fees from a start date, with or without usage. Creates the contract's prices and offer, and moves the account onto it.`
    : contract?.started
      ? t`New fees apply from the account's next billing date, so this month is billed as agreed. One-time fees aren't charged again.`
      : t`The account moves onto these fees when the contract starts.`;

  return (
    <DialogForm
      open={mode !== null}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitText={isSetup ? t`Set up contract` : t`Change fees`}
      cancelText={t`Cancel`}
      schema={schema}
      defaultValues={defaultValues}
      contentClassName="sm:max-w-2xl"
      onSubmit={handleSubmit}>
      <ContractFeeList services={services} allowOneTime={allowOneTime} />

      <PriceListPicker usageOptions={usageOptions} feeOptions={feeOptions} />

      {isSetup ? (
        <Form.Field
          name="startsAt"
          label={t`Start date`}
          description={t`Charges start on this day, in UTC, and bill on it each month. Today or later.`}
          required>
          <ContractStartPicker now={now} />
        </Form.Field>
      ) : null}

      <ContractSummary isSetup={isSetup} feeOptions={feeOptions} />
    </DialogForm>
  );
}

/**
 * The contract's fees, one row each: a name for invoices, the unit amount
 * and how many, optionally what the amount is per, one-time or monthly, and
 * the service it's for, if any. Each fee is its own pricing and invoice line.
 */
function ContractFeeList({
  services,
  allowOneTime,
}: {
  services: ServiceOption[];
  allowOneTime: boolean;
}) {
  const fees = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const { errors } = useFormState({ control: form.control, name: 'fees' });
  const listError = errors.fees?.message ?? errors.fees?.root?.message;
  return (
    <Form.FieldArray name="fees">
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text size="sm" weight="medium">
              <Trans>Fees</Trans>
            </Text>
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              htmlType="button"
              icon={<Icon icon={Plus} size={14} />}
              disabled={fields.length >= MAX_CONTRACT_FEES}
              onClick={() =>
                append({
                  label: '',
                  chargeType: 'Recurring',
                  amount: '',
                  quantity: '1',
                  pricingUnit: '',
                  // New fees are usually for the same service as the last.
                  serviceRef: fees[fees.length - 1]?.serviceRef ?? NO_SERVICE,
                } satisfies ContractFeeRow)
              }>
              <Trans>Add fee</Trans>
            </Button>
          </div>
          {fields.length === 0 ? (
            <Text size="sm" textColor="muted">
              <Trans>None: the contract charges only what&apos;s picked from the price list.</Trans>
            </Text>
          ) : null}
          {listError ? (
            <Text size="sm" textColor="destructive" role="alert">
              {listError}
            </Text>
          ) : null}
          {fields.map((field, index) => (
            <div key={field.key} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_7rem_5rem_auto] items-start gap-2">
                <Form.Field name={`fees.${index}.label`} label={t`Name`} required>
                  <Form.Input placeholder={t`Dedicated server`} />
                </Form.Field>
                <Form.Field
                  name={`fees.${index}.amount`}
                  label={t`Amount (${CONTRACT_CURRENCY})`}
                  required>
                  <Form.Input inputMode="decimal" placeholder="1000.00" />
                </Form.Field>
                <Form.Field name={`fees.${index}.quantity`} label={t`Quantity`} required>
                  <Form.Input inputMode="numeric" placeholder="1" />
                </Form.Field>
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  htmlType="button"
                  className="mt-6"
                  aria-label={t`Remove fee`}
                  icon={<Icon icon={X} size={14} />}
                  onClick={() => remove(index)}
                />
              </div>
              <div className="grid grid-cols-[7rem_7rem_minmax(0,1fr)] items-start gap-2">
                <Form.Field name={`fees.${index}.chargeType`} label={t`Charged`} required>
                  <Form.Select>
                    {allowOneTime || fees[index]?.chargeType === 'OneTime' ? (
                      <Form.SelectItem value="OneTime">
                        <Trans>Once</Trans>
                      </Form.SelectItem>
                    ) : null}
                    <Form.SelectItem value="Recurring">
                      <Trans>Monthly</Trans>
                    </Form.SelectItem>
                  </Form.Select>
                </Form.Field>
                <Form.Field name={`fees.${index}.pricingUnit`} label={t`Per`}>
                  <Form.Input placeholder={t`port, kW`} />
                </Form.Field>
                <Form.Field name={`fees.${index}.serviceRef`} label={t`Service`}>
                  <Form.Select>
                    <Form.SelectItem value={NO_SERVICE}>
                      <Trans>None</Trans>
                    </Form.SelectItem>
                    {services.map((service) => (
                      <Form.SelectItem key={service.serviceName} value={service.serviceName}>
                        {service.label}
                      </Form.SelectItem>
                    ))}
                  </Form.Select>
                </Form.Field>
              </div>
            </div>
          ))}
        </div>
      )}
    </Form.FieldArray>
  );
}

type UsageRowValues = ContractFormValues['usage'][number];
type ListFeeRowValues = ContractFormValues['listFees'][number];

type PriceListEntry =
  | { kind: 'usage'; option: UsageMeterOption; index: number }
  | { kind: 'fee'; option: ListFeeOption; index: number };

/**
 * What the contract bills from the platform's price list, by service: each
 * meter's usage pricing, at its list rates with an optional discount or at
 * the customer's own rates, and each list fee, with a quantity and an
 * optional discount or the customer's own amount. The customer's own price
 * becomes a pricing based on the list one, so the list price stays visible.
 */
function PriceListPicker({
  usageOptions,
  feeOptions,
}: {
  usageOptions: UsageMeterOption[];
  feeOptions: ListFeeOption[];
}) {
  const fromPriceList = Form.useWatch('fromPriceList') as boolean | undefined;
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );
  const groups = useMemo(() => {
    const byService = new Map<string, PriceListEntry[]>();
    const add = (serviceRef: string, entry: PriceListEntry) =>
      byService.set(serviceRef, [...(byService.get(serviceRef) ?? []), entry]);
    usageOptions.forEach((option, index) =>
      add(option.serviceRef, { kind: 'usage', option, index })
    );
    feeOptions.forEach((option, index) => add(option.serviceRef, { kind: 'fee', option, index }));
    // Fees that aren't for a service go last.
    return [...byService.entries()].sort(
      ([a], [b]) => Number(a === '') - Number(b === '') || a.localeCompare(b)
    );
  }, [usageOptions, feeOptions]);

  if (groups.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>The platform&apos;s price list is empty.</Trans>
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Form.Field
        name="fromPriceList"
        description={t`Usage and fees at their list price, less any discount, or at the customer's own price, shown beside the list price.`}>
        <Form.Switch label={t`Bill from the price list`} />
      </Form.Field>
      {fromPriceList ? (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-md border p-3">
          {groups.map(([serviceRef, entries]) => (
            <div key={serviceRef || 'none'} className="flex flex-col gap-1">
              <Text size="xs" weight="medium" textColor="muted">
                {serviceRef
                  ? servicesByRef.get(serviceRef)?.spec?.displayName || serviceRef
                  : t`Not for a service`}
              </Text>
              {entries.map((entry) =>
                entry.kind === 'usage' ? (
                  <UsageMeterRow
                    key={`usage-${entry.option.metric}`}
                    option={entry.option}
                    index={entry.index}
                  />
                ) : (
                  <ListFeeRowFields
                    key={`fee-${entry.option.name}`}
                    option={entry.option}
                    index={entry.index}
                  />
                )
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A list fee's price, e.g. "$300.00 a month, per port". */
const listFeePriceText = (option: ListFeeOption) => {
  const amount = formatMoney(Number.parseFloat(option.amount), CONTRACT_CURRENCY);
  const price = option.chargeType === 'OneTime' ? t`${amount} once` : t`${amount} a month`;
  return option.pricingUnit ? t`${price}, per ${option.pricingUnit}` : price;
};

function ListFeeRowFields({ option, index }: { option: ListFeeOption; index: number }) {
  const row = Form.useWatch(`listFees.${index}`) as ListFeeRowValues | undefined;
  const price = listFeePriceText(option);
  return (
    <div className="flex flex-col gap-2 rounded-md py-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 flex-col">
          <Form.Field name={`listFees.${index}.selected`}>
            <Form.Checkbox label={option.label} />
          </Form.Field>
          <Text size="xs" textColor="muted" className="pl-6">
            <Trans>List: {price}</Trans>
          </Text>
        </div>
        {row?.selected ? (
          <div className="flex items-start gap-2">
            <Form.Field name={`listFees.${index}.quantity`} className="w-20">
              <Form.Input inputMode="numeric" placeholder="1" aria-label={t`Quantity`} />
            </Form.Field>
            <Form.Field name={`listFees.${index}.discount`} className="w-20">
              <Form.Input inputMode="numeric" placeholder={t`% off`} aria-label={t`Discount`} />
            </Form.Field>
          </div>
        ) : null}
      </div>
      {row?.selected ? (
        <div className="flex flex-col gap-2 pl-6">
          <Form.Field name={`listFees.${index}.custom`}>
            <Form.Switch label={t`Customer's own amount`} />
          </Form.Field>
          {row.custom ? (
            <Form.Field
              name={`listFees.${index}.amount`}
              label={
                option.pricingUnit
                  ? t`Amount (${CONTRACT_CURRENCY}), per ${option.pricingUnit}`
                  : t`Amount (${CONTRACT_CURRENCY})`
              }
              description={t`List: ${price}`}
              className="w-56">
              <Form.Input inputMode="decimal" placeholder={option.amount} />
            </Form.Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UsageMeterRow({ option, index }: { option: UsageMeterOption; index: number }) {
  const row = Form.useWatch(`usage.${index}`) as UsageRowValues | undefined;
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const list = option.pricings.find((p) => p.metadata?.name === row?.pricingName);
  const slots = rateSlots(list?.spec);
  const unit = option.pricingUnit;

  // A different list pricing may price the meter in more or fewer rates, so
  // the customer's rates start again from its list rates.
  const pricingName = row?.pricingName;
  const slotCount = slots.length;
  useEffect(() => {
    if (!row || row.amounts.length === slotCount) return;
    form.setValue(
      `usage.${index}.amounts`,
      slots.map((slot) => slot.listAmount),
      { shouldDirty: true }
    );
    // Only when the pricing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingName, slotCount]);

  return (
    <div className="flex flex-col gap-2 rounded-md py-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Form.Field name={`usage.${index}.selected`}>
          <Form.Checkbox label={option.label} />
        </Form.Field>
        {row?.selected ? (
          <div className="flex items-center gap-2">
            {option.pricings.length > 1 ? (
              <Form.Field name={`usage.${index}.pricingName`} className="w-44">
                <Form.Select>
                  {option.pricings.map((pricing, i) => {
                    const name = pricing.metadata?.name ?? '';
                    return (
                      <Form.SelectItem key={name} value={name}>
                        {name}
                        {i === 0 ? t` · newest` : ''}
                      </Form.SelectItem>
                    );
                  })}
                </Form.Select>
              </Form.Field>
            ) : null}
            <Form.Field name={`usage.${index}.discount`} className="w-20">
              <Form.Input inputMode="numeric" placeholder={t`% off`} aria-label={t`Discount`} />
            </Form.Field>
          </div>
        ) : null}
      </div>
      {row?.selected ? (
        <div className="flex flex-col gap-2 pl-6">
          <Form.Field name={`usage.${index}.custom`}>
            <Form.Switch label={t`Customer's own rates`} />
          </Form.Field>
          {row.custom ? (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot, slotIndex) => (
                <Form.Field
                  key={`${row.pricingName}-${slotIndex}`}
                  name={`usage.${index}.amounts.${slotIndex}`}
                  label={slot.label ? t`${slot.label}, per ${unit}` : t`Per ${unit}`}
                  description={t`List: ${slot.listAmount}`}>
                  <Form.Input inputMode="decimal" placeholder={slot.listAmount} />
                </Form.Field>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A single day, today (UTC) to a year ahead. Form.DatePicker picks a range
 * and stores a string, so this wires the single-date picker into the field.
 */
function ContractStartPicker({ now }: { now: Date }) {
  const { id, fieldState } = Form.useFieldContext();
  const value = fieldState?.value instanceof Date ? fieldState.value : null;
  const today = startOfUtcDay(now);
  return (
    <DatePicker
      id={id}
      value={value}
      onChange={(date) => {
        fieldState?.change(date ?? undefined);
        fieldState?.blur();
      }}
      placeholder={t`Pick a date`}
      modal
      commit="immediate"
      minDate={localDateForUtcDay(today)}
      maxDate={localDateForUtcDay(
        new Date(today.getTime() + (MAX_CONTRACT_LEAD_DAYS - 1) * 24 * 60 * 60 * 1000)
      )}
      triggerClassName="w-full"
    />
  );
}

/** What the first invoice will be, worked out from the form as it's filled. */
function ContractSummary({
  isSetup,
  feeOptions,
}: {
  isSetup: boolean;
  feeOptions: ListFeeOption[];
}) {
  const rows = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  const fromPriceList = Form.useWatch('fromPriceList') as boolean | undefined;
  const listRows = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const picked = Form.useWatch('startsAt') as Date | undefined;
  const fees = [
    ...rows.map((row) => ({
      chargeType: row.chargeType,
      amount: parseAmount(row.amount),
      quantity: Number.parseInt(row.quantity, 10) || 1,
    })),
    ...(fromPriceList ? listRows : []).flatMap((row, index) => {
      const option = feeOptions[index];
      if (!row.selected || !option) return [];
      return [
        {
          chargeType: option.chargeType,
          amount: listFeeRowAmount(row, option),
          quantity: Number.parseInt(row.quantity, 10) || 1,
        },
      ];
    }),
  ];
  if (!fees.some((fee) => fee.amount > 0)) return null;

  const hasOneTime = fees.some((fee) => fee.chargeType === 'OneTime' && fee.amount > 0);
  const perMonth = formatMoney(monthlyTotal(fees), CONTRACT_CURRENCY);
  const startsAt = picked ? contractStartFromDate(picked) : null;
  // Set up on its start day, the account moves onto the contract when it's
  // saved, so the first month is prorated from then.
  const now = new Date();
  const startsToday = isSetup && startsAt?.getTime() === startOfUtcDay(now).getTime();
  const share = startsAt && startsToday ? firstMonthShare(startsAt, now) : 1;
  const prorated = share < 1 && monthlyTotal(fees) > 0;
  const total = formatMoney(
    prorated ? proratedFirstInvoiceTotal(fees, share) : firstInvoiceTotal(fees),
    CONTRACT_CURRENCY
  );
  const firstMonth = formatMoney(
    proratedFirstInvoiceTotal(
      fees.filter((fee) => fee.chargeType === 'Recurring'),
      share
    ),
    CONTRACT_CURRENCY
  );

  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-md border px-3 py-2">
      <Text as="p" size="sm" weight="medium">
        {startsToday ? (
          <Trans>
            First invoice today: about {total}, then {perMonth} a month.
          </Trans>
        ) : isSetup && startsAt ? (
          <Trans>
            First invoice on{' '}
            <InlineDate date={startsAt.toISOString()} variant="absolute" format="MMM d, yyyy" />:{' '}
            {total}, then {perMonth} a month.
          </Trans>
        ) : isSetup || hasOneTime ? (
          <Trans>
            First invoice: {total}, then {perMonth} a month.
          </Trans>
        ) : (
          <Trans>{perMonth} a month from the next billing date.</Trans>
        )}
      </Text>
      {prorated ? (
        <Text as="p" size="xs" textColor="warning">
          <Trans>
            Starting today, the first month is charged from when you save, so it&apos;s prorated:
            about {firstMonth} of {perMonth}. Start tomorrow for a full first month.
          </Trans>
        </Text>
      ) : null}
      <Text as="p" size="xs" textColor="muted">
        <Trans>Before discounts and tax, plus any usage. Check it with a preview once saved.</Trans>
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
