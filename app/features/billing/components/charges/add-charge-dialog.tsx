import { useAccountPaymentMethods } from '../../hooks';
import {
  buildChargeSpec,
  catalogPricingName,
  chargeAmounts,
  chargeItemOptions,
  chargeName,
  chargeSummary,
  currentBillingPeriod,
  emptyChargeFormValues,
  formatChargeMoney,
  formatServicePeriod,
  invoiceNowOutcome,
  isBeforePeriod,
  isoDay,
  MAX_CHARGE_NOTE,
  nextBillingPeriod,
  parseHundredths,
  pricingUnitAmount,
  type ChargeFormValues,
  type ServicePeriod,
} from '../../lib/charges';
import { startOfUtcDay } from '../../lib/contract';
import {
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  getBillingAccountDisplayName,
  type BillingAccount,
} from '../../utils';
import { ShowSubmitErrors } from '../contract-editor/show-submit-errors';
import { ItemOptions, SupplyDateField } from '../item-options';
import { ChargeItemPicker, PickedItemInfo } from './charge-item-picker';
import { buildChargeSchema } from './schema';
import { chargeServerErrors } from './server-errors';
import { useCreateChargeMutation, useServicePricingListQuery } from '@/resources/request/client';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Label } from '@datum-cloud/datum-ui/label';
import { RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWatch, type FieldErrors, type UseFormReturn } from 'react-hook-form';

/** The fields under "Item options", which open when one of them has an error. */
const OPTION_FIELDS: (keyof ChargeFormValues)[] = [
  'taxCode',
  'notTaxable',
  'discountPercent',
  'periodStart',
  'periodEnd',
  'note',
];

/**
 * Adds a charge to the account, laid out like a line in Stripe's invoice
 * editor: the item, quantity and price, then item options (tax, discount,
 * supply date, a note for staff), when it's invoiced, and the line as the
 * invoice will show it. Invoicing it now asks to confirm first.
 *
 * Mount it only while it's open: the date its defaults and limits are
 * worked out from is taken when it opens, as billing's webhook will take
 * its own when the charge is sent.
 */
export function AddChargeDialog({
  orgName,
  account,
  onClose,
}: {
  orgName: string;
  account: BillingAccount;
  onClose: () => void;
}) {
  const [now] = useState(() => new Date());
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header
          title={t`Add charge`}
          description={t`A one-off line on ${getBillingAccountDisplayName(account)}'s invoice: a catalog item or a custom one.`}
        />
        {pricingsQuery.isLoading ? (
          <Dialog.Body className="flex flex-col gap-3 px-5" aria-busy="true">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-2/3 rounded" />
            <Skeleton className="h-24 w-full rounded" />
          </Dialog.Body>
        ) : (
          <AddChargeForm
            orgName={orgName}
            account={account}
            now={now}
            pricings={pricingsQuery.data?.items ?? []}
            catalogFailed={pricingsQuery.isError}
            onClose={onClose}
          />
        )}
      </Dialog.Content>
    </Dialog>
  );
}

function AddChargeForm({
  orgName,
  account,
  now,
  pricings,
  catalogFailed,
  onClose,
}: {
  orgName: string;
  account: BillingAccount;
  now: Date;
  pricings: NonNullable<ReturnType<typeof useServicePricingListQuery>['data']>['items'];
  catalogFailed: boolean;
  onClose: () => void;
}) {
  const accountName = account.metadata?.name ?? '';
  const accountDisplayName = getBillingAccountDisplayName(account);
  const createCharge = useCreateChargeMutation(orgName, accountName);
  const schema = useMemo(() => buildChargeSchema(now), [now]);
  const currentPeriod = useMemo(() => currentBillingPeriod(account, now), [account, now]);
  const options = useMemo(() => chargeItemOptions(pricings, account), [pricings, account]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Invoicing now confirms in a second step, with what the form had.
  const [confirming, setConfirming] = useState<ChargeFormValues | null>(null);
  // What billing refused that isn't one field's, shown above the buttons.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const formRef = useRef<UseFormReturn<ChargeFormValues> | null>(null);
  // One name for the dialog, picked on the first try and sent on every
  // retry, so a retry after a lost response can't add a second charge.
  const nameRef = useRef<string | null>(null);
  // Set while a create is in flight, so a double click sends it once.
  const sendingRef = useRef(false);

  const create = async (values: ChargeFormValues) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setFormErrors([]);
    nameRef.current ??= chargeName(values.description);
    try {
      await createCharge.mutateAsync({
        spec: buildChargeSpec(values, accountName),
        name: nameRef.current,
      });
      toast.success(
        values.invoice === 'Now'
          ? t`Charge added. It's invoiced on its own now.`
          : t`Charge added. It goes on the account's next invoice.`
      );
      onClose();
    } catch (err) {
      setConfirming(null);
      const form = formRef.current;
      const unplaced: string[] = [];
      for (const error of chargeServerErrors(err, values.setPeriod)) {
        if (error.field && form) {
          form.setError(error.field, { type: 'server', message: error.message });
          if (OPTION_FIELDS.includes(error.field)) setOptionsOpen(true);
        } else {
          unplaced.push(error.message);
        }
      }
      setFormErrors(unplaced);
    } finally {
      sendingRef.current = false;
    }
  };

  const handleSubmit = async (values: ChargeFormValues) => {
    if (values.invoice === 'Now') {
      setFormErrors([]);
      setConfirming(values);
      return;
    }
    await create(values);
  };

  return (
    <Form.Root
      schema={schema}
      defaultValues={emptyChargeFormValues()}
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col">
      {({ isSubmitting }) => {
        const busy = isSubmitting || createCharge.isPending;
        return (
          <>
            <ShowSubmitErrors />
            <FormBridge formRef={formRef} onOptionErrors={() => setOptionsOpen(true)} />
            <Dialog.Body className={cn('flex flex-col gap-4 px-5 pt-0', confirming && 'hidden')}>
              {catalogFailed ? (
                <Text size="sm" textColor="muted">
                  <Trans>Couldn&apos;t load the catalog. You can still add a custom item.</Trans>
                </Text>
              ) : null}
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-3">
                <Form.Field name="item" label={t`Item`} required>
                  <ChargeItemPicker
                    options={options}
                    accountPricesLabel={t`${accountDisplayName}'s contract prices`}
                    onCatalogTax={() => setOptionsOpen(true)}
                  />
                </Form.Field>
                <Form.Field name="quantity" label={t`Qty`} required>
                  <Form.Input inputMode="decimal" placeholder="1" />
                </Form.Field>
              </div>
              <PickedItemInfo options={options} />
              <Form.Field
                name="description"
                label={t`Description`}
                description={t`What the invoice calls the line. Never put the SKU here.`}
                required>
                <Form.Input placeholder={t`Cross-connect install, cage 12`} />
              </Form.Field>
              <PriceField options={options} />

              <ChargeItemOptions
                open={optionsOpen}
                onToggle={() => setOptionsOpen((open) => !open)}
                account={account}
                now={now}
                currentPeriod={currentPeriod}
              />

              <Form.Field name="invoice" label={t`When`}>
                <Form.RadioGroup orientation="horizontal">
                  <TimingOption value="NextInvoice" label={t`On the next invoice`} />
                  <TimingOption value="Now" label={t`Invoice now`} />
                </Form.RadioGroup>
              </Form.Field>

              <ChargeInvoiceLine currentPeriod={currentPeriod} />

              <FormErrors errors={formErrors} />
            </Dialog.Body>

            {confirming ? (
              <Dialog.Body className="flex flex-col gap-3 px-5 pt-0">
                <InvoiceNowConfirmation
                  orgName={orgName}
                  account={account}
                  values={confirming}
                  currentPeriod={currentPeriod}
                />
                <FormErrors errors={formErrors} />
              </Dialog.Body>
            ) : null}

            <Dialog.Footer className="gap-2">
              {confirming ? (
                <>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={busy}
                    onClick={() => setConfirming(null)}>
                    <Trans>Back</Trans>
                  </Button>
                  <Button
                    htmlType="button"
                    loading={createCharge.isPending}
                    disabled={busy}
                    onClick={() => void create(confirming)}>
                    <Trans>Invoice now</Trans>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={busy}
                    onClick={onClose}>
                    <Trans>Cancel</Trans>
                  </Button>
                  <Button htmlType="submit" loading={busy} disabled={busy}>
                    <Trans>Add charge</Trans>
                  </Button>
                </>
              )}
            </Dialog.Footer>
          </>
        );
      }}
    </Form.Root>
  );
}

/**
 * Keeps a handle on the form, for placing billing's refusals on their
 * fields after a create fails, and opens the item options when a submit
 * finds an error in one of them.
 */
function FormBridge({
  formRef,
  onOptionErrors,
}: {
  formRef: { current: UseFormReturn<ChargeFormValues> | null };
  onOptionErrors: () => void;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const { submitCount, errors } = form.formState;
  useEffect(() => {
    formRef.current = form;
  }, [form, formRef]);
  // Once per submit, so staff can still close the options afterwards.
  const handledSubmits = useRef(0);
  useEffect(() => {
    if (submitCount <= handledSubmits.current) return;
    handledSubmits.current = submitCount;
    if (hasOptionError(errors)) onOptionErrors();
  }, [submitCount, errors, onOptionErrors]);
  return null;
}

const hasOptionError = (errors: FieldErrors<ChargeFormValues>) =>
  OPTION_FIELDS.some((field) => Boolean(errors[field]));

function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

/**
 * The price per unit: a catalog item's, which staff can change, with the
 * list price and a reset beside it when they have. A custom item's is
 * required.
 */
function PriceField({ options }: { options: ReturnType<typeof chargeItemOptions> }) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const item = (Form.useWatch('item') as string | undefined) ?? '';
  const unitAmount = (Form.useWatch('unitAmount') as string | undefined) ?? '';
  const pricingName = catalogPricingName(item);
  const fee = pricingName
    ? [...options.accountPrices, ...options.catalog].find((option) => option.name === pricingName)
    : undefined;
  const listCents = fee ? parseHundredths(fee.amount) : null;
  const changed = fee !== undefined && parseHundredths(unitAmount) !== listCents;
  const unit = fee?.pricingUnit || t`unit`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <Form.Field name="unitAmount" label={t`Price (US$)`} required className="w-40">
          <Form.Input inputMode="decimal" placeholder="250.00" />
        </Form.Field>
        <Text size="sm" textColor="muted" className="pb-2">
          <Trans>per {unit}</Trans>
        </Text>
        {changed ? (
          <Text size="sm" textColor="muted" className="ml-auto pb-2">
            <Trans>
              List price {listCents === null ? `${fee.amount} USD` : formatChargeMoney(listCents)}
            </Trans>{' '}
            ·{' '}
            <button
              type="button"
              className="text-foreground underline underline-offset-2"
              onClick={() =>
                form.setValue('unitAmount', pricingUnitAmount(fee.amount), {
                  shouldDirty: true,
                  shouldValidate: form.formState.isSubmitted,
                })
              }>
              <Trans>Reset</Trans>
            </button>
          </Text>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Tax, discount, supply date and the staff note, collapsed by default as in
 * Stripe's editor.
 */
function ChargeItemOptions({
  open,
  onToggle,
  account,
  now,
  currentPeriod,
}: {
  open: boolean;
  onToggle: () => void;
  account: BillingAccount;
  now: Date;
  currentPeriod: ServicePeriod;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const notTaxable = Boolean(Form.useWatch('notTaxable'));
  const periodEnd = (Form.useWatch('periodEnd') as string | undefined) ?? '';
  const nextPeriod = useMemo(() => nextBillingPeriod(account, now), [account, now]);
  const today = isoDay(startOfUtcDay(now));
  const set = <K extends keyof ChargeFormValues>(name: K, value: ChargeFormValues[K]) =>
    form.setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  const setDates = (period: ServicePeriod) => {
    set('periodStart', period.start);
    set('periodEnd', period.end);
  };

  return (
    <ItemOptions open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-1.5">
        <Form.Field
          name="taxCode"
          label={t`Tax code`}
          description={t`One of Stripe's tax codes, such as txcd_20030000. Leave it empty for the account's default.`}>
          <Form.Input placeholder="txcd_20030000" disabled={notTaxable} />
        </Form.Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={notTaxable}
            onCheckedChange={(checked) => {
              set('notTaxable', checked === true);
              if (checked === true) set('taxCode', '');
            }}
          />
          <Trans>Not taxable</Trans>
        </label>
      </div>

      <Form.Field name="discountPercent" label={t`Discount (%)`} className="w-40">
        <Form.Input inputMode="decimal" placeholder={t`None`} />
      </Form.Field>

      <SupplyDateField
        defaultPeriod={() => currentPeriod}
        unsetHint={
          <Trans>
            Current billing period, {formatServicePeriod(currentPeriod)}. Tick to choose other
            dates, such as the day of an install.
          </Trans>
        }>
        <Text as="p" size="sm" className="flex flex-wrap items-center gap-x-1">
          <Shortcut onClick={() => setDates(currentPeriod)}>
            <Trans>This billing period</Trans>
          </Shortcut>
          <span aria-hidden>·</span>
          <Shortcut onClick={() => setDates(nextPeriod)}>
            <Trans>Next billing period</Trans>
          </Shortcut>
          <span aria-hidden>·</span>
          <Shortcut onClick={() => setDates({ start: today, end: today })}>
            <Trans>Today</Trans>
          </Shortcut>
        </Text>
        {isBeforePeriod(periodEnd, currentPeriod) ? (
          <Text size="sm" className="text-warning flex items-center gap-1.5">
            <Icon icon={TriangleAlert} size={14} />
            <Trans>These dates are before the current billing period.</Trans>
          </Text>
        ) : null}
      </SupplyDateField>

      <Form.Field
        name="note"
        label={t`Note for staff`}
        description={
          notTaxable
            ? t`Required: say why it isn't taxable. Never shown to the customer.`
            : t`Never shown to the customer. Up to ${MAX_CHARGE_NOTE} characters.`
        }
        required={notTaxable}>
        <Form.Textarea rows={2} placeholder={t`Installed for the new cage; ticket OPS-1234`} />
      </Form.Field>
    </ItemOptions>
  );
}

function Shortcut({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="underline underline-offset-2" onClick={onClick}>
      {children}
    </button>
  );
}

/** The line as the customer will read it on the invoice. */
function ChargeInvoiceLine({ currentPeriod }: { currentPeriod: ServicePeriod }) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const values = useWatch({ control: form.control }) as ChargeFormValues;
  return <ChargeLineSummary summary={chargeSummary(values, currentPeriod)} />;
}

/** The invoice line: description, quantity and price, amount and dates. */
export function ChargeLineSummary({ summary }: { summary: ReturnType<typeof chargeSummary> }) {
  return (
    <div className="bg-background flex flex-col gap-1 rounded-md px-3 py-2">
      <Text size="xs" textColor="muted">
        <Trans>On the invoice</Trans>
      </Text>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Text size="sm" weight="medium" className="break-words">
            {summary.description || '—'}
          </Text>
          {summary.line ? (
            <Text size="sm" textColor="muted">
              {summary.line}
            </Text>
          ) : null}
          <Text size="xs" textColor="muted">
            <Trans>{summary.dates} · Tax is worked out by Stripe on the invoice</Trans>
          </Text>
        </div>
        <Text size="sm" weight="medium" className="shrink-0 tabular-nums">
          {summary.amount || '—'}
        </Text>
      </div>
    </div>
  );
}

/**
 * One choice of when the charge is invoiced. Form.RadioItem top-aligns the
 * radio and nudges it down by a fixed margin, which leaves it below the
 * middle of a one-line label; this centres the two instead.
 */
function TimingOption({ value, label }: { value: string; label: string }) {
  const id = `charge-invoice-${value}`;
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

/** Invoice now's second step: the total before tax, and what happens next. */
function InvoiceNowConfirmation({
  orgName,
  account,
  values,
  currentPeriod,
}: {
  orgName: string;
  account: BillingAccount;
  values: ChargeFormValues;
  currentPeriod: ServicePeriod;
}) {
  const { paymentMethods } = useAccountPaymentMethods(orgName, account);
  const amounts = chargeAmounts(values.quantity, values.unitAmount, values.discountPercent);
  const amountDue = amounts.ok ? amounts.amountDue : 0n;
  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" weight="medium">
        <Trans>Invoice this charge now?</Trans>
      </Text>
      <ChargeLineSummary summary={chargeSummary(values, currentPeriod)} />
      <Text size="sm">
        <Trans>
          It goes on an invoice of its own, for {formatChargeMoney(amountDue)} before tax, sent as
          soon as the billing provider has it.
        </Trans>{' '}
        {invoiceNowOutcome(account, amountDue, paymentMethods)}
      </Text>
    </div>
  );
}
