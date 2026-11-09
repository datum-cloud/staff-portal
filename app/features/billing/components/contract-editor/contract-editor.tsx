import {
  contractStartFromDate,
  getContractFees,
  getContractState,
  localDateForUtcDay,
  MAX_CONTRACT_LEAD_DAYS,
  parseAmount,
  startOfUtcDay,
  toPricingAmount,
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
  useOfferDetailQuery,
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

  const title = isSetup ? t`Set up contract` : t`Change contract fees`;
  const description = isSetup
    ? t`Bill ${getBillingAccountDisplayName(account)} negotiated fees from a start date, with or without usage. Saving creates the contract's prices and offer, and moves the account onto it.`
    : contract.started
      ? t`New fees apply from the account's next billing date, so this month is billed as agreed. One-time fees aren't charged again.`
      : t`The account moves onto these fees when the contract starts.`;

  // The form starts from the pricings, the current offer and, for a new
  // contract, the default offer's usage, so it waits for them.
  const loading =
    entitlementQuery.isLoading ||
    pricingsQuery.isLoading ||
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
    !isSetup && (currentOfferQuery.isError || !currentOfferQuery.data)
      ? { label: t`the contract's current offer`, query: currentOfferQuery }
      : null,
  ].filter((failure) => failure !== null);
  const defaultOfferProblem: DefaultOfferProblem | undefined = !isSetup
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
      ) : !entitlement ? (
        <SectionCard contentClassName="py-6">
          <Text>
            <Trans>
              This account has no entitlement yet, so it can&apos;t have a contract. Assign it an
              offer first.
            </Trans>
          </Text>
        </SectionCard>
      ) : (
        <ContractEditorForm
          orgName={orgName}
          account={account}
          entitlement={entitlement}
          contract={contract}
          currentOffer={currentOfferQuery.data ?? null}
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
  defaultOffer,
  defaultOfferProblem,
  pricings,
  now,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  defaultOffer: ComMiloapisBillingV1Alpha1Offer | null;
  defaultOfferProblem?: DefaultOfferProblem;
  pricings: ServicePricing[];
  now: Date;
}) {
  const navigate = useNavigate();
  const accountName = account.metadata?.name ?? '';
  const entitlementName = entitlement.metadata?.name ?? '';
  const detailUrl = billingAccountRoutes.detail(orgName, accountName);
  const setUp = useSetUpContractMutation(orgName, accountName);
  const changeFees = useChangeContractFeesMutation(orgName, accountName);
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

  const pickFrom = isSetup ? defaultOffer : currentOffer;
  const usageRows = usageRowsFromOffer(usageOptions, pickFrom);
  const listFeeRows = listFeeRowsFromOffer(feeOptions, pickFrom);
  // Fees the price list's rows show stay there; the rest are the contract's
  // own, including any whose list fee has gone, so saving keeps them.
  const listedFees = isSetup ? new Set<string>() : listFeeNames(listFeeRows);
  const currentFees = getContractFees(currentOffer).filter(
    (fee) => (allowOneTime || fee.chargeType === 'Recurring') && !listedFees.has(fee.name)
  );
  const currentFeeByName = new Map(currentFees.map((fee) => [fee.name, fee]));
  // Usage the price list can't show, such as a pricing being deleted, is
  // kept as it is rather than dropped.
  const keptUsageRefs = isSetup ? [] : unclaimedUsageRefs(usageRows, currentOffer);
  const keptUsageNames = keptUsageRefs.map(
    (ref) =>
      currentOffer?.spec?.servicePricings?.find((snap) => snap.name === ref.name)?.spec
        ?.displayName || ref.name
  );

  const blankFee = (chargeType: ContractFeeRow['chargeType'], label: string): ContractFeeRow => ({
    label,
    chargeType,
    amount: '',
    quantity: '1',
    pricingUnit: '',
    serviceRef: NO_SERVICE,
  });
  const defaultFees: ContractFeeRow[] = !isSetup
    ? currentFees.map((fee) => ({
        label: fee.label,
        chargeType: fee.chargeType,
        amount: toPricingAmount(fee.amount),
        quantity: String(fee.quantity),
        pricingUnit: fee.pricingUnit ?? '',
        serviceRef: fee.serviceRef ?? NO_SERVICE,
        existingPricing: fee.name,
      }))
    : [blankFee('OneTime', t`Setup fee`), blankFee('Recurring', t`Monthly fee`)];

  const schema = useMemo(
    () => buildContractSchema(isSetup, allowOneTime, now),
    [isSetup, allowOneTime, now]
  );
  const defaultValues: ContractFormValues = {
    fees: defaultFees,
    usage: usageRows.map(toUsageRowValues),
    listFees: listFeeRows.map(toListFeeRowValues),
    startsAt: undefined,
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
          };
        }),
        ...buildListFeePlan(values.listFees.map(fromListFeeRowValues), feeOptions, currentOffer),
      ],
      usage: withKeptRefs(
        buildUsagePlan(usage, usageOptions, DEFAULT_SERVICE_PRICING_NAMESPACE, currentOffer),
        keptUsageRefs
      ),
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
                {defaultOfferProblem ? (
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
                    htmlType="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting || (!isSetup && !isDirty)}>
                    {isSetup ? <Trans>Set up contract</Trans> : <Trans>Change fees</Trans>}
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
