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
  usageRowsFromOffer,
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
  const defaultOfferName = useBillingDefaultOfferQuery().data ?? '';
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
    (isSetup && (!defaultOfferName || defaultOfferQuery.isLoading));

  return (
    <div className="m-4 flex flex-col gap-4">
      <PageHeader title={title} description={description} />
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-40 w-full rounded" />
          <Skeleton className="h-64 w-full rounded" />
        </div>
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
          defaultOffer={defaultOfferQuery.data ?? null}
          pricings={pricingsQuery.data?.items ?? []}
          now={now}
        />
      )}
    </div>
  );
}

function ContractEditorForm({
  orgName,
  account,
  entitlement,
  contract,
  currentOffer,
  defaultOffer,
  pricings,
  now,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  defaultOffer: ComMiloapisBillingV1Alpha1Offer | null;
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

  const usageOptions = useMemo(() => listUsageMeterOptions(pricings), [pricings]);
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
  const pickFrom = isSetup ? defaultOffer : currentOffer;
  const usageRows = usageRowsFromOffer(usageOptions, pickFrom);
  const listFeeRows = listFeeRowsFromOffer(feeOptions, pickFrom);

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
    const usage = values.usage.map((row, index) => {
      const option = usageOptions[index];
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
      usage: buildUsagePlan(usage, usageOptions, DEFAULT_SERVICE_PRICING_NAMESPACE, currentOffer),
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
              <PriceListTable usageOptions={usageOptions} feeOptions={feeOptions} />
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
