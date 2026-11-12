import {
  contractStartFromDate,
  DEFAULT_FEE_BILLING_TIMING,
  getContractFees,
  getContractState,
  getDraftStartsAt,
  localDateForUtcDay,
  MAX_CONTRACT_LEAD_DAYS,
  parseAmount,
  startOfUtcDay,
  toPricingAmount,
  withDraftSnapshot,
  type ContractState,
} from '../../lib/contract';
import {
  buildListFeePlan,
  listFeeNames,
  listFeeOptions,
  listFeeRowsFromOffer,
} from '../../lib/contract-list-fees';
import {
  buildUsagePlan,
  listUsageMeterOptions,
  rateSlots,
  unclaimedUsageRefs,
  usageRowsFromOffer,
  type UsagePlan,
} from '../../lib/contract-usage';
import { DEFAULT_SERVICE_PRICING_NAMESPACE, getBillingAccountDisplayName } from '../../utils';
import { ContractFeeList, type ServiceOption } from './contract-fee-list';
import { ContractSummary } from './contract-summary';
import { PriceListTable } from './price-list-table';
import {
  buildContractSchema,
  fromListFeeRowValues,
  fromUsageRowValues,
  NO_SERVICE,
  sameFeePricing,
  toListFeeRowValues,
  toRfc3339,
  toUsageRowValues,
  type ContractFeeRow,
  type ContractFormValues,
} from './schema';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/features/milo';
import {
  useBillingDefaultOfferQuery,
  useBillingEntitlementForAccountQuery,
  useChangeContractFeesMutation,
  useContractDraftQuery,
  useOfferDetailQuery,
  useSaveContractDraftMutation,
  useServiceListQuery,
  useServicePricingListQuery,
  useSetUpContractMutation,
  type ServicePricing,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { DatePicker } from '@datum-cloud/datum-ui/picker';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * Sets up a contract on a billing account, or changes its fees: the fees made
 * for it, what it bills from the price list, and, for a new contract, its
 * start date, with the first invoice worked out alongside. Saving creates the
 * contract's pricings and Offer and moves the account onto it.
 */
export function ContractEditor({
  orgName,
  account,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
}) {
  // Fixed for the page's life, so the start date checks don't drift.
  const [now] = useState(() => new Date());
  const accountName = account.metadata?.name ?? '';
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const entitlement = entitlementQuery.data ?? null;
  const contract = getContractState(entitlement, now);
  const isSetup = !contract;
  const currentOfferQuery = useOfferDetailQuery(
    contract ? (entitlement?.spec?.offerRef?.name ?? '') : ''
  );
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  const defaultOfferNameQuery = useBillingDefaultOfferQuery();
  const defaultOfferName = defaultOfferNameQuery.data ?? '';
  const defaultOfferQuery = useOfferDetailQuery(isSetup ? defaultOfferName : '');
  // A saved draft is where the form starts, and what publishing replaces.
  const draftQuery = useContractDraftQuery(orgName, accountName);
  const pricings = pricingsQuery.data?.items;
  const draft = useMemo(
    () => (draftQuery.data && pricings ? withDraftSnapshot(draftQuery.data, pricings) : null),
    [draftQuery.data, pricings]
  );

  const title = isSetup
    ? draft
      ? t`Edit draft contract`
      : t`Set up contract`
    : draft
      ? t`Edit draft fee change`
      : t`Change contract fees`;
  // A quarterly or annual fee billed in advance has been invoiced for its
  // whole period, so openmeter-provider holds a change until that ends.
  const heldForLongFee = getContractFees(currentOfferQuery.data).some(
    (fee) => fee.billingTiming === 'InAdvance' && fee.interval && fee.interval !== 'monthly'
  );
  const description = isSetup
    ? t`Bill ${getBillingAccountDisplayName(account)} negotiated fees from a start date, with or without usage. Save a draft to finish later; nothing is billed until it's published, which moves the account onto it.`
    : contract.started
      ? heldForLongFee
        ? t`The contract has a quarterly or annual fee billed in advance, so changes apply when that fee's current period ends, which can be up to a year away. One-time fees aren't charged again.`
        : t`New fees apply from the account's next billing date, so this month is billed as agreed. One-time fees aren't charged again.`
      : t`The account moves onto these fees when the contract starts.`;

  // The form starts from the pricings, the current offer and, for a new
  // contract, the default offer's usage, so it waits for them.
  const loading =
    entitlementQuery.isLoading ||
    pricingsQuery.isLoading ||
    draftQuery.isLoading ||
    (!isSetup && currentOfferQuery.isLoading) ||
    (isSetup &&
      (defaultOfferNameQuery.isLoading ||
        (Boolean(defaultOfferName) && defaultOfferQuery.isLoading)));

  // Saving replaces the contract's fees and usage with the form's, so the
  // form isn't shown on anything less than what it starts from. The default
  // offer only suggests what a new contract bills, so it doesn't block.
  const failed = [
    entitlementQuery.isError
      ? { label: t`the account's entitlement`, query: entitlementQuery }
      : null,
    pricingsQuery.isError ? { label: t`the price list`, query: pricingsQuery } : null,
    draftQuery.isError ? { label: t`the account's draft contract`, query: draftQuery } : null,
    !isSetup && (currentOfferQuery.isError || !currentOfferQuery.data)
      ? { label: t`the contract's current offer`, query: currentOfferQuery }
      : null,
  ].filter((failure) => failure !== null);
  // A draft says what the contract bills, so the default offer isn't asked.
  const defaultOfferProblem: DefaultOfferProblem | undefined =
    !isSetup || draft
      ? undefined
      : defaultOfferNameQuery.isError ||
          (defaultOfferName && (defaultOfferQuery.isError || !defaultOfferQuery.data))
        ? 'failed'
        : !defaultOfferName
          ? 'none'
          : undefined;

  return (
    <div className="m-4 flex flex-col gap-4">
      <PageHeader title={title} description={description} />
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-40 w-full rounded" />
          <Skeleton className="h-64 w-full rounded" />
        </div>
      ) : failed.length > 0 ? (
        <SectionCard contentClassName="flex flex-col items-start gap-3 py-6">
          <Text>
            <Trans>
              Couldn&apos;t load {failed.map((failure) => failure.label).join(', ')}, so the
              contract can&apos;t be changed safely right now.
            </Trans>
          </Text>
          <Button
            type="secondary"
            theme="outline"
            size="small"
            htmlType="button"
            onClick={() => failed.forEach((failure) => void failure.query.refetch())}>
            <Trans>Try again</Trans>
          </Button>
        </SectionCard>
      ) : (
        <ContractEditorForm
          orgName={orgName}
          account={account}
          entitlement={entitlement}
          contract={contract}
          currentOffer={currentOfferQuery.data ?? null}
          draft={draft}
          defaultOffer={defaultOfferProblem ? null : (defaultOfferQuery.data ?? null)}
          defaultOfferProblem={defaultOfferProblem}
          pricings={pricingsQuery.data?.items ?? []}
          now={now}
        />
      )}
    </div>
  );
}

/** Why a new contract's price list starts with nothing ticked. */
type DefaultOfferProblem = 'none' | 'failed';

function ContractEditorForm({
  orgName,
  account,
  entitlement,
  contract,
  currentOffer,
  draft,
  defaultOffer,
  defaultOfferProblem,
  pricings,
  now,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  /** None when the account has no entitlement: setting up a contract creates it. */
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  /** The account's draft, with the snapshot it would have once published. */
  draft: ComMiloapisBillingV1Alpha1Offer | null;
  defaultOffer: ComMiloapisBillingV1Alpha1Offer | null;
  defaultOfferProblem?: DefaultOfferProblem;
  pricings: ServicePricing[];
  now: Date;
}) {
  const navigate = useNavigate();
  const accountName = account.metadata?.name ?? '';
  const entitlementName = entitlement?.metadata?.name;
  const detailUrl = billingAccountRoutes.detail(orgName, accountName);
  const setUp = useSetUpContractMutation(orgName, accountName);
  const changeFees = useChangeContractFeesMutation(orgName, accountName);
  const saveDraft = useSaveContractDraftMutation(orgName, accountName);
  const draftName = draft?.metadata?.name;
  // Which button submitted the form. The schema asks at validation, after
  // the click, to let a draft leave its start date for later; the state is
  // for the buttons' spinners.
  const [intent, setIntent] = useState<SubmitIntent>('publish');
  const [submitIntent] = useState(() => createSubmitIntent());
  const submitAs = (next: SubmitIntent) => {
    submitIntent.set(next);
    setIntent(next);
  };
  const servicesQuery = useServiceListQuery();

  const isSetup = !contract;
  // A one-time fee is charged whenever the account moves onto an Offer that
  // has one, so a contract that has started is amended without them.
  const allowOneTime = isSetup || !contract.started;

  // The form's rows are built once, from the price list as it was when the
  // page opened, and matched to these options by position. The pricing list
  // refetches in the background, so the options are kept as they were too:
  // a pricing added or removed meanwhile would otherwise shift the rows.
  const [{ usageOptions, feeOptions }] = useState(() => ({
    usageOptions: listUsageMeterOptions(pricings),
    feeOptions: listFeeOptions(pricings).filter(
      (option) => allowOneTime || option.chargeType === 'Recurring'
    ),
  }));
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

  // Without list prices (as before any ServicePricing exists) the contract
  // bills only its own fees, and there's nothing to tick.
  const priceListEmpty = usageOptions.length === 0 && feeOptions.length === 0;
  // What the form starts from and what saving can reuse pricings from: the
  // draft, else the contract's current offer. A new contract without a draft
  // starts from the default offer's usage, with nothing to reuse.
  const base = draft ?? currentOffer;
  const pickFrom = draft ?? (isSetup ? defaultOffer : currentOffer);
  const usageRows = usageRowsFromOffer(usageOptions, pickFrom);
  const listFeeRows = listFeeRowsFromOffer(feeOptions, pickFrom);
  // Fees the price list's rows show stay there; the rest are the contract's
  // own, including any whose list fee has gone, so saving keeps them.
  const listedFees = base ? listFeeNames(listFeeRows) : new Set<string>();
  const currentFees = getContractFees(base).filter(
    (fee) => (allowOneTime || fee.chargeType === 'Recurring') && !listedFees.has(fee.name)
  );
  const currentFeeByName = new Map(currentFees.map((fee) => [fee.name, fee]));
  // Usage the price list can't show, such as a pricing being deleted, is
  // kept as it is rather than dropped.
  const keptUsageRefs = base ? unclaimedUsageRefs(usageRows, base) : [];
  const keptUsageNames = keptUsageRefs.map(
    (ref) =>
      base?.spec?.servicePricings?.find((snap) => snap.name === ref.name)?.spec?.displayName ||
      ref.name
  );

  const blankFee = (chargeType: ContractFeeRow['chargeType'], label: string): ContractFeeRow => ({
    label,
    chargeType,
    interval: 'monthly',
    billingTiming: DEFAULT_FEE_BILLING_TIMING,
    amount: '',
    quantity: '1',
    pricingUnit: '',
    serviceRef: NO_SERVICE,
  });
  const defaultFees: ContractFeeRow[] = base
    ? currentFees.map((fee) => ({
        label: fee.label,
        chargeType: fee.chargeType,
        // Fees the contract charges now keep their timing: in advance for
        // one from before the choice existed, as billing reads it.
        interval: fee.interval ?? 'monthly',
        billingTiming: fee.billingTiming ?? 'InAdvance',
        amount: toPricingAmount(fee.amount),
        quantity: String(fee.quantity),
        pricingUnit: fee.pricingUnit ?? '',
        serviceRef: fee.serviceRef ?? NO_SERVICE,
        existingPricing: fee.name,
      }))
    : [blankFee('OneTime', t`Setup fee`), blankFee('Recurring', t`Monthly fee`)];

  const draftStartsAt = isSetup ? getDraftStartsAt(draft) : undefined;
  const schema = useMemo(
    () => buildContractSchema(isSetup, allowOneTime, now, submitIntent.isDraft),
    [isSetup, allowOneTime, now, submitIntent]
  );
  const defaultValues: ContractFormValues = {
    fees: defaultFees,
    usage: usageRows.map(toUsageRowValues),
    listFees: listFeeRows.map(toListFeeRowValues),
    startsAt: draftStartsAt ? localDateForUtcDay(draftStartsAt) : undefined,
  };

  const handleSubmit = async (values: ContractFormValues) => {
    const optionByMetric = new Map(usageOptions.map((option) => [option.metric, option]));
    const usage = values.usage.map((row) => {
      const option = optionByMetric.get(row.metric);
      const list = option?.pricings.find((p) => p.metadata?.name === row.pricingName);
      return fromUsageRowValues(
        row,
        rateSlots(list?.spec).map((slot) => slot.listAmount)
      );
    });
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
            ...(fee.chargeType === 'Recurring'
              ? { interval: fee.interval, billingTiming: fee.billingTiming }
              : {}),
          };
        }),
        ...buildListFeePlan(values.listFees.map(fromListFeeRowValues), feeOptions, base),
      ],
      usage: withKeptRefs(
        buildUsagePlan(usage, usageOptions, DEFAULT_SERVICE_PRICING_NAMESPACE, base),
        keptUsageRefs
      ),
    };
    const startsAt = values.startsAt
      ? toRfc3339(contractStartFromDate(values.startsAt))
      : undefined;
    try {
      if (submitIntent.isDraft()) {
        // A fee change takes effect when it's published, so only a new
        // contract's draft keeps a start date.
        await saveDraft.mutateAsync({ offer, startsAt: isSetup ? startsAt : undefined });
        toast.success(t`Draft saved. Nothing is billed until it's published.`);
      } else if (isSetup) {
        await setUp.mutateAsync({
          entitlementName,
          startsAt: startsAt as string,
          offer,
          draftName,
        });
        toast.success(t`Contract set up`);
      } else if (entitlementName) {
        // A contract is only ever on an entitlement.
        await changeFees.mutateAsync({ entitlementName, offer, draftName });
        toast.success(t`Contract fees changed`);
      }
      navigate(detailUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to save the contract`);
    }
  };

  return (
    <Form.Root schema={schema} defaultValues={defaultValues} onSubmit={handleSubmit}>
      {({ isSubmitting, isDirty }) => (
        <div className="grid grid-cols-1 items-start gap-4 @5xl/main:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            <SectionCard
              title={<Trans>Contract fees</Trans>}
              description={t`Fees made for this contract, such as a setup fee or a negotiated monthly fee. Each is an invoice line.`}>
              <ContractFeeList services={services} allowOneTime={allowOneTime} />
            </SectionCard>

            <SectionCard
              title={<Trans>Price list</Trans>}
              description={t`What the contract bills from the platform's prices. Leave the customer price empty to bill the list price.`}>
              <div className="flex flex-col gap-3">
                {defaultOfferProblem && !priceListEmpty ? (
                  <Text size="sm" textColor="muted">
                    {defaultOfferProblem === 'none' ? (
                      <Trans>
                        No default offer is set up, so nothing starts ticked. Tick what the contract
                        bills.
                      </Trans>
                    ) : (
                      <Trans>
                        Couldn&apos;t load the default offer, so nothing starts ticked. Tick what
                        the contract bills.
                      </Trans>
                    )}
                  </Text>
                ) : null}
                {keptUsageNames.length > 0 ? (
                  <Text size="sm" textColor="muted">
                    <Trans>
                      Also kept as it is, because it isn&apos;t on the price list:{' '}
                      {keptUsageNames.join(', ')}.
                    </Trans>
                  </Text>
                ) : null}
                <PriceListTable usageOptions={usageOptions} feeOptions={feeOptions} />
              </div>
            </SectionCard>
          </div>

          <aside className="flex flex-col gap-4 @5xl/main:sticky @5xl/main:top-4">
            {isSetup ? (
              <SectionCard title={<Trans>Start date</Trans>}>
                <Form.Field
                  name="startsAt"
                  description={t`Charges start on this day, in UTC, and bill on it each month. Today or later.`}
                  required>
                  <ContractStartPicker now={now} />
                </Form.Field>
              </SectionCard>
            ) : null}
            <SectionCard title={<Trans>Summary</Trans>}>
              <ContractSummary isSetup={isSetup} feeOptions={feeOptions}>
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={isSubmitting}
                    onClick={() => navigate(detailUrl)}>
                    <Trans>Cancel</Trans>
                  </Button>
                  <Button
                    type="secondary"
                    theme="outline"
                    htmlType="submit"
                    onClick={() => submitAs('draft')}
                    loading={isSubmitting && intent === 'draft'}
                    // Nothing to save until the form differs from what it
                    // started from, unless that was a new contract's blank.
                    disabled={isSubmitting || (!isDirty && Boolean(base))}>
                    <Trans>Save as draft</Trans>
                  </Button>
                  <Button
                    htmlType="submit"
                    onClick={() => submitAs('publish')}
                    loading={isSubmitting && intent === 'publish'}
                    // A draft can be published as it is.
                    disabled={isSubmitting || (!isSetup && !isDirty && !draft)}>
                    <Trans>Publish</Trans>
                  </Button>
                </div>
              </ContractSummary>
            </SectionCard>
          </aside>
        </div>
      )}
    </Form.Root>
  );
}

type SubmitIntent = 'publish' | 'draft';

/** Which of the form's buttons submitted it, read when the form validates. */
const createSubmitIntent = () => {
  let current: SubmitIntent = 'publish';
  return {
    set: (next: SubmitIntent) => {
      current = next;
    },
    isDraft: () => current === 'draft',
  };
};

/** A usage plan with refs the form doesn't show added after its own. */
const withKeptRefs = (plan: UsagePlan, kept: UsagePlan['refs']): UsagePlan =>
  kept.length > 0 ? { ...plan, refs: [...plan.refs, ...kept] } : plan;

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
