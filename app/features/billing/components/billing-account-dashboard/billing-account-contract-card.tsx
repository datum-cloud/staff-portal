import {
  contractBillingDay,
  contractStartFromDate,
  contractStartProblem,
  firstInvoiceTotal,
  getContractFees,
  getContractState,
  getUsagePricingRefs,
  localDateForUtcDay,
  MAX_CONTRACT_LEAD_DAYS,
  offerBillsUsage,
  parseAmount,
  startOfUtcDay,
  toPricingAmount,
  type ContractState,
} from '../../lib/contract';
import { formatMoney, getBillingAccountDisplayName, getOfferDisplayName } from '../../utils';
import { BILLING_ACCOUNT_SECTION_IDS } from './billing-account-attention-banner';
import { CardMessage, InlineDate, SectionAnchor } from './card-parts';
import { DialogForm } from '@/components/dialog';
import { SectionCard } from '@/features/milo';
import {
  useBillingDefaultOfferQuery,
  useChangeContractFeesMutation,
  useOfferDetailQuery,
  useOfferListQuery,
  usePreviewNextInvoiceMutation,
  useServiceListQuery,
  useSetUpContractMutation,
  type InvoiceRequest,
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
import { Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { FileSearch, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

/** Contract fees are USD only, like every ServicePricing. */
const CONTRACT_CURRENCY = 'USD';

/** The usage picker's value for a contract that bills fixed fees only. */
const NO_USAGE = 'none';

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
          accountName={accountName}
          firstInvoice={contract ? !contract.started : false}
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

function ContractFees({ offer }: { offer: ComMiloapisBillingV1Alpha1Offer }) {
  const fees = getContractFees(offer);
  const discount = offer.spec?.discount?.percentage;
  return (
    <div className="flex flex-col gap-1.5">
      {fees.length === 0 ? (
        <Text size="sm" textColor="muted">
          <Trans>This offer has no fixed fees.</Trans>
        </Text>
      ) : (
        <ul className="flex flex-col gap-1">
          {fees.map((fee) => (
            <li key={fee.name} className="flex items-baseline justify-between gap-3">
              <Text size="sm" className="truncate">
                {fee.label}
              </Text>
              <Text size="sm" className="shrink-0 tabular-nums">
                {fee.chargeType === 'OneTime' ? (
                  <Trans>{formatMoney(fee.amount, CONTRACT_CURRENCY)} once</Trans>
                ) : (
                  <Trans>{formatMoney(fee.amount, CONTRACT_CURRENCY)} / month</Trans>
                )}
              </Text>
            </li>
          ))}
        </ul>
      )}
      <Text size="xs" textColor="muted">
        {offerBillsUsage(offer) ? (
          <Trans>Plus usage, from {getOfferDisplayName(offer)}.</Trans>
        ) : (
          <Trans>Fixed fees only: usage isn&apos;t billed.</Trans>
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

const amountField = (message: string) =>
  z.string().refine((value) => !Number.isNaN(parseAmount(value)), { message });

const buildContractSchema = (needsStart: boolean, needsSetupFee: boolean, now: Date) =>
  z
    .object({
      serviceRef: z.string().min(1, t`Pick the service the fees are for.`),
      setupFeeLabel: z.string(),
      setupFeeAmount: z.string(),
      monthlyFeeLabel: z
        .string()
        .trim()
        .min(1, t`Name the monthly fee, as invoices show it.`),
      monthlyFeeAmount: amountField(t`Enter an amount, such as 1000 or 1000.00.`),
      usageOffer: z.string().min(1),
      startsAt: z.date().optional(),
    })
    .superRefine((values, ctx) => {
      if (needsSetupFee && values.setupFeeAmount.trim()) {
        if (Number.isNaN(parseAmount(values.setupFeeAmount))) {
          ctx.addIssue({
            code: 'custom',
            path: ['setupFeeAmount'],
            message: t`Enter an amount, or leave it empty for no setup fee.`,
          });
        }
        if (!values.setupFeeLabel.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['setupFeeLabel'],
            message: t`Name the setup fee, as invoices show it.`,
          });
        }
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

/** RFC 3339 at second precision, as Kubernetes writes times. */
const toRfc3339 = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

function ContractDialog({
  orgName,
  account,
  entitlement,
  contract,
  currentOffer,
  mode,
  now,
  onOpenChange,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  contract: ContractState | null;
  currentOffer: ComMiloapisBillingV1Alpha1Offer | null;
  mode: ContractDialogMode | null;
  now: Date;
  onOpenChange: (open: boolean) => void;
}) {
  const accountName = account.metadata?.name ?? '';
  const entitlementName = entitlement.metadata?.name ?? '';
  const setUp = useSetUpContractMutation(orgName, accountName);
  const changeFees = useChangeContractFeesMutation(orgName, accountName);
  const servicesQuery = useServiceListQuery();
  const defaultOfferName = useBillingDefaultOfferQuery().data ?? '';
  const offersQuery = useOfferListQuery({ limit: 500 });

  const isSetup = mode === 'setup';
  // A setup fee is charged whenever the account moves onto an Offer that has
  // one, so a contract that has started is amended without it.
  const needsSetupFee = isSetup || !contract?.started;

  // Usage is billed at the rates (and discounts) of an offer staff pick:
  // any published offer with usage pricing. Other accounts' contract offers
  // are left out; the account's own current one stays, so an amendment can
  // keep its rates.
  const currentOfferName = currentOffer?.metadata?.name ?? '';
  const usageOffers = useMemo(() => {
    const listed = (offersQuery.data?.items ?? []).filter(
      (offer) =>
        offer.spec?.launchStage === 'GA' &&
        getUsagePricingRefs(offer).length > 0 &&
        (!offer.metadata?.name?.startsWith('contract-') || offer.metadata.name === currentOfferName)
    );
    return listed.sort((a, b) => getOfferDisplayName(a).localeCompare(getOfferDisplayName(b)));
  }, [offersQuery.data?.items, currentOfferName]);
  const usageOfferByName = new Map(usageOffers.map((offer) => [offer.metadata?.name ?? '', offer]));
  const defaultUsageOffer = [currentOfferName, defaultOfferName].find((name) =>
    usageOfferByName.has(name)
  );

  const services = useMemo(
    () =>
      (servicesQuery.data?.items ?? [])
        .filter((service) => service.spec?.serviceName)
        .sort((a, b) =>
          (a.spec?.displayName ?? a.metadata?.name ?? '').localeCompare(
            b.spec?.displayName ?? b.metadata?.name ?? ''
          )
        ),
    [servicesQuery.data?.items]
  );

  const currentFees = getContractFees(currentOffer);
  const currentMonthly = currentFees.find((fee) => fee.chargeType === 'Recurring');
  const currentSetup = currentFees.find((fee) => fee.chargeType === 'OneTime');
  const defaultServiceRef =
    currentMonthly?.serviceRef ??
    services.find((service) => service.spec?.serviceName?.includes('bare-metal'))?.spec
      ?.serviceName ??
    '';

  const schema = useMemo(
    () => buildContractSchema(isSetup, needsSetupFee, now),
    [isSetup, needsSetupFee, now]
  );
  const defaultValues: ContractFormValues = {
    serviceRef: defaultServiceRef,
    setupFeeLabel: (!isSetup && currentSetup?.label) || t`Setup fee`,
    setupFeeAmount: !isSetup && currentSetup ? toPricingAmount(currentSetup.amount) : '',
    monthlyFeeLabel: (!isSetup && currentMonthly?.label) || t`Monthly fee`,
    monthlyFeeAmount: '',
    usageOffer:
      (isSetup || offerBillsUsage(currentOffer)) && defaultUsageOffer
        ? defaultUsageOffer
        : NO_USAGE,
    startsAt: undefined,
  };

  const handleSubmit = async (values: ContractFormValues) => {
    const setupAmount = parseAmount(values.setupFeeAmount);
    const offer = {
      accountName,
      displayName: t`${getBillingAccountDisplayName(account)} contract`,
      serviceRef: values.serviceRef,
      setupFee:
        needsSetupFee && !Number.isNaN(setupAmount) && setupAmount > 0
          ? { label: values.setupFeeLabel.trim(), amount: toPricingAmount(setupAmount) }
          : undefined,
      monthlyFee: {
        label: values.monthlyFeeLabel.trim(),
        amount: toPricingAmount(parseAmount(values.monthlyFeeAmount)),
      },
      usageRefs: getUsagePricingRefs(usageOfferByName.get(values.usageOffer)),
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
    ? t`Bill this account a negotiated set fee from a start date, with or without usage. Creates the contract's prices and offer, and moves the account onto it.`
    : contract?.started
      ? t`New fees apply from the account's next billing date, so this month is billed as agreed. The setup fee isn't charged again.`
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
      onSubmit={handleSubmit}>
      <Form.Field
        name="serviceRef"
        label={t`Service`}
        description={t`The catalog service the fees are for.`}
        required>
        <Form.Select placeholder={t`Select a service`}>
          {services.map((service) => {
            const serviceName = service.spec?.serviceName ?? '';
            return (
              <Form.SelectItem key={serviceName} value={serviceName}>
                {service.spec?.displayName || service.metadata?.name} ({serviceName})
              </Form.SelectItem>
            );
          })}
        </Form.Select>
      </Form.Field>

      {needsSetupFee ? (
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <Form.Field name="setupFeeLabel" label={t`Setup fee`}>
            <Form.Input />
          </Form.Field>
          <Form.Field
            name="setupFeeAmount"
            label={t`Amount (${CONTRACT_CURRENCY})`}
            description={t`Optional`}>
            <Form.Input inputMode="decimal" placeholder="1500.00" />
          </Form.Field>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
        <Form.Field name="monthlyFeeLabel" label={t`Monthly fee`} required>
          <Form.Input />
        </Form.Field>
        <Form.Field name="monthlyFeeAmount" label={t`Amount (${CONTRACT_CURRENCY})`} required>
          <Form.Input inputMode="decimal" placeholder="1000.00" />
        </Form.Field>
      </div>

      <Form.Field
        name="usageOffer"
        label={t`Usage`}
        description={t`Bill usage too, at the rates and discounts of a published offer.`}
        required>
        <Form.Select placeholder={t`Select an offer`}>
          <Form.SelectItem value={NO_USAGE}>
            <Trans>Don&apos;t bill usage</Trans>
          </Form.SelectItem>
          {usageOffers.map((offer) => {
            const name = offer.metadata?.name ?? '';
            return (
              <Form.SelectItem key={name} value={name}>
                {getOfferDisplayName(offer)} ({name})
                {name === currentOfferName
                  ? t` · current`
                  : name === defaultOfferName
                    ? t` · default`
                    : ''}
              </Form.SelectItem>
            );
          })}
        </Form.Select>
      </Form.Field>

      {isSetup ? (
        <Form.Field
          name="startsAt"
          label={t`Start date`}
          description={t`Charges start on this day, in UTC, and bill on it each month. Today or later.`}
          required>
          <ContractStartPicker now={now} />
        </Form.Field>
      ) : null}

      <ContractSummary isSetup={isSetup} needsSetupFee={needsSetupFee} />
    </DialogForm>
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
function ContractSummary({ isSetup, needsSetupFee }: { isSetup: boolean; needsSetupFee: boolean }) {
  const monthly = parseAmount(Form.useWatch('monthlyFeeAmount') as string | undefined);
  const setupWatched = Form.useWatch('setupFeeAmount') as string | undefined;
  const setup = needsSetupFee ? parseAmount(setupWatched) : Number.NaN;
  const picked = Form.useWatch('startsAt') as Date | undefined;
  if (Number.isNaN(monthly)) return null;

  const total = formatMoney(firstInvoiceTotal(setup, monthly), CONTRACT_CURRENCY);
  const perMonth = formatMoney(monthly, CONTRACT_CURRENCY);
  const startsAt = picked ? contractStartFromDate(picked) : null;

  return (
    <div className="bg-muted/40 rounded-md border px-3 py-2">
      <Text size="sm">
        {isSetup && startsAt ? (
          <Trans>
            First invoice on{' '}
            <InlineDate date={startsAt.toISOString()} variant="absolute" format="MMM d, yyyy" />:{' '}
            {total}, then {perMonth} a month.
          </Trans>
        ) : needsSetupFee ? (
          <Trans>
            First invoice: {total}, then {perMonth} a month.
          </Trans>
        ) : (
          <Trans>{perMonth} a month from the next billing date.</Trans>
        )}
      </Text>
      <Text size="xs" textColor="muted">
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
  accountName,
  firstInvoice,
  onClose,
}: {
  orgName: string;
  accountName: string;
  firstInvoice: boolean;
  onClose: () => void;
}) {
  const preview = usePreviewNextInvoiceMutation(orgName, accountName);
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
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="tertiary" theme="borderless" onClick={onClose}>
            <Trans>Close</Trans>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
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
