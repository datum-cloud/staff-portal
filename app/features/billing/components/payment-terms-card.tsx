import {
  buildArrangementPatch,
  buildArrangementSpec,
  buildEndArrangementPatch,
  emptyPaymentTermsForm,
  getArrangementPhase,
  getArrangementStart,
  getArrangementsForAccount,
  getBillingStatus,
  getCurrentArrangement,
  getPaymentReadyCondition,
  paymentTermsFormFromArrangement,
  paymentTermsFormSchema,
  type BillingArrangement,
  type BillingArrangementPhase,
  type BillingStatus,
  type PaymentTermsFormValues,
} from '../lib/payment-terms';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { SectionCard } from '@/features/milo';
import {
  useBillingAccountDetailQuery,
  useBillingArrangementListForOrgQuery,
  useCreateBillingArrangementMutation,
  usePatchBillingArrangementMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { type ReactNode, useMemo, useState } from 'react';

type PaymentTermsCardProps = {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
};

const billingStatusBadge: Record<BillingStatus, { state: string }> = {
  invoice: { state: 'success' },
  card: { state: 'success' },
  'terms-scheduled': { state: 'info' },
  'terms-ended': { state: 'error' },
  'card-failing': { state: 'error' },
  'not-set-up': { state: 'error' },
  unknown: { state: 'warning' },
};

// Ended terms are a normal part of history, so grey rather than red.
const phaseBadgeState: Record<BillingArrangementPhase, string> = {
  Active: 'active',
  Scheduled: 'info',
  Ended: 'unknown',
};

/**
 * Payment terms staff have granted to the account (BillingArrangements), so
 * it can be billed by invoice instead of by card. Staff can grant terms,
 * change the current terms, and end or withdraw them. Terms are never
 * deleted here: ending them keeps the record for history.
 */
export function PaymentTermsCard({ orgName, account }: PaymentTermsCardProps) {
  const { t } = useLingui();
  const accountName = account.metadata?.name ?? '';
  const currency = account.spec?.currencyCode ?? '';

  const arrangementsQuery = useBillingArrangementListForOrgQuery(orgName);
  // The loader's copy of the account goes stale once terms change, and
  // PaymentReady is what decides whether the customer is let through.
  const accountQuery = useBillingAccountDetailQuery(orgName, accountName);
  const createMutation = useCreateBillingArrangementMutation(orgName, accountName);
  const patchMutation = usePatchBillingArrangementMutation(orgName, accountName);

  const [grantOpen, setGrantOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const arrangements = useMemo(
    () => getArrangementsForAccount(arrangementsQuery.data?.items ?? [], accountName),
    [arrangementsQuery.data?.items, accountName]
  );
  const current = getCurrentArrangement(arrangements);
  const currentName = current?.metadata?.name ?? '';
  const currentPhase = current ? getArrangementPhase(current) : undefined;
  const paymentReady = getPaymentReadyCondition(accountQuery.data ?? account);
  const billingStatus = getBillingStatus(paymentReady);
  const billingStatusLabel: Record<BillingStatus, string> = {
    invoice: t`Invoice`,
    card: t`Card`,
    'terms-scheduled': t`Not billable yet: terms are scheduled`,
    'terms-ended': t`Not billable: terms have ended`,
    'card-failing': t`Not billable: card is failing`,
    'not-set-up': t`Not billable: no card or terms`,
    unknown: t`Unknown`,
  };
  const history = arrangements.filter((arrangement) => arrangement !== current);

  const handleGrant = async (values: PaymentTermsFormValues) => {
    try {
      await createMutation.mutateAsync(buildArrangementSpec(values, accountName));
      toast.success(t`Payment terms granted`);
    } catch (error) {
      throw error; // keep the dialog open; the API error is already shown
    }
  };

  const handleChange = async (values: PaymentTermsFormValues) => {
    if (!currentName) return;
    try {
      await patchMutation.mutateAsync({
        name: currentName,
        patch: buildArrangementPatch(values, { canChangeStart: currentPhase === 'Scheduled' }),
      });
      toast.success(t`Payment terms updated`);
    } catch (error) {
      throw error; // keep the dialog open; the API error is already shown
    }
  };

  const handleEnd = async () => {
    if (!currentName || !currentPhase) return;
    try {
      await patchMutation.mutateAsync({
        name: currentName,
        patch: buildEndArrangementPatch(currentPhase),
      });
      toast.success(
        currentPhase === 'Scheduled' ? t`Payment terms withdrawn` : t`Payment terms ended`
      );
    } catch (error) {
      throw error;
    }
  };

  const formatCreditLimit = (amount?: string) =>
    amount ? [amount, currency].filter(Boolean).join(' ') : '—';

  return (
    <>
      <SectionCard
        title={<Trans>Payment terms</Trans>}
        action={
          <Button type="tertiary" theme="outline" size="small" onClick={() => setGrantOpen(true)}>
            <Trans>Grant terms</Trans>
          </Button>
        }>
        {arrangementsQuery.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Text size="sm" className="text-muted-foreground">
                <Trans>Billed by</Trans>
              </Text>
              <div className="mt-1.5">
                <BadgeState
                  state={billingStatusBadge[billingStatus].state}
                  message={billingStatusLabel[billingStatus]}
                  tooltip={paymentReady?.message}
                />
              </div>
            </div>

            {current && currentPhase ? (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Text size="sm" weight="medium">
                      <Trans>Invoice terms</Trans>
                    </Text>
                    <BadgeState
                      state={phaseBadgeState[currentPhase]}
                      message={currentPhase === 'Active' ? t`Active` : t`Scheduled`}
                      variant="dot"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="tertiary"
                      theme="outline"
                      size="small"
                      onClick={() => setChangeOpen(true)}>
                      <Trans>Change</Trans>
                    </Button>
                    <Button
                      type="warning"
                      theme="outline"
                      size="small"
                      onClick={() => setEndOpen(true)}>
                      {currentPhase === 'Scheduled' ? <Trans>Withdraw</Trans> : <Trans>End</Trans>}
                    </Button>
                  </div>
                </div>
                <ArrangementDetails arrangement={current} formatCreditLimit={formatCreditLimit} />
              </div>
            ) : (
              <Text size="sm" className="text-muted-foreground block">
                {billingStatus === 'card' ? (
                  <Trans>No payment terms. This account pays by card.</Trans>
                ) : (
                  <Trans>
                    No payment terms. Grant terms to let this account be billed by invoice.
                  </Trans>
                )}
              </Text>
            )}

            {history.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <Text size="sm" weight="medium" className="block">
                  <Trans>Previous terms</Trans>
                </Text>
                <ul className="divide-y">
                  {history.map((arrangement) => (
                    <ArrangementHistoryRow
                      key={arrangement.metadata?.name}
                      arrangement={arrangement}
                      formatCreditLimit={formatCreditLimit}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      <PaymentTermsFormDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        title={t`Grant payment terms`}
        description={t`The account will be billed by invoice on these terms. Overlapping terms are rejected, so end the current terms first if there are any.`}
        submitText={t`Grant`}
        currency={currency}
        defaultValues={emptyPaymentTermsForm}
        showStart
        onSubmit={handleGrant}
      />

      {current ? (
        <PaymentTermsFormDialog
          // Remount when the current arrangement changes so defaults reload.
          key={`${currentName}-${current.metadata?.resourceVersion}`}
          open={changeOpen}
          onOpenChange={setChangeOpen}
          title={t`Change payment terms`}
          description={t`Changes apply to the terms currently on the account.`}
          submitText={t`Save`}
          currency={currency}
          defaultValues={paymentTermsFormFromArrangement(current)}
          showStart={currentPhase === 'Scheduled'}
          onSubmit={handleChange}
        />
      ) : null}

      <DialogConfirm
        open={endOpen}
        onOpenChange={setEndOpen}
        title={currentPhase === 'Scheduled' ? t`Withdraw payment terms` : t`End payment terms`}
        description={
          currentPhase === 'Scheduled'
            ? t`These terms will never take effect. The record is kept for history.`
            : t`The account will stop being billed by invoice now and will need a card to keep using paid services. The record is kept for history.`
        }
        confirmText={currentPhase === 'Scheduled' ? t`Withdraw` : t`End terms`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleEnd}
      />
    </>
  );
}

function TermField({
  label,
  children,
  wide = false,
}: {
  label: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2 sm:col-span-4' : undefined}>
      <Text size="xs" className="text-muted-foreground block">
        {label}
      </Text>
      <Text as="div" size="sm" className="mt-0.5">
        {children}
      </Text>
    </div>
  );
}

function ArrangementDetails({
  arrangement,
  formatCreditLimit,
}: {
  arrangement: BillingArrangement;
  formatCreditLimit: (amount?: string) => string;
}) {
  const invoice = arrangement.spec?.invoice;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      <TermField label={<Trans>Net days</Trans>}>{invoice?.netDays ?? '—'}</TermField>
      <TermField label={<Trans>Credit limit</Trans>}>
        {formatCreditLimit(invoice?.creditLimit)}
      </TermField>
      <TermField label={<Trans>Starts</Trans>}>
        <DateTime date={getArrangementStart(arrangement)} variant="both" />
      </TermField>
      <TermField label={<Trans>Ends</Trans>}>
        {arrangement.spec?.endsAt ? (
          <DateTime date={arrangement.spec.endsAt} variant="both" />
        ) : (
          <Trans>No end date</Trans>
        )}
      </TermField>
      <TermField label={<Trans>Invoices to</Trans>}>
        {invoice?.accountsPayableEmail || '—'}
      </TermField>
      <TermField label={<Trans>PO number</Trans>}>{invoice?.purchaseOrderNumber || '—'}</TermField>
      <TermField label={<Trans>Agreement</Trans>} wide>
        {invoice?.agreementReference || '—'}
      </TermField>
      <TermField label={<Trans>Reason (internal)</Trans>} wide>
        {arrangement.spec?.reason || '—'}
      </TermField>
    </div>
  );
}

/** One line per earlier arrangement: phase, the headline terms and when. */
function ArrangementHistoryRow({
  arrangement,
  formatCreditLimit,
}: {
  arrangement: BillingArrangement;
  formatCreditLimit: (amount?: string) => string;
}) {
  const phase = getArrangementPhase(arrangement);
  const invoice = arrangement.spec?.invoice;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
      <BadgeState state={phaseBadgeState[phase]} message={phase} variant="dot" />
      <Text size="sm">
        <Trans>
          Net {invoice?.netDays ?? '—'}, limit {formatCreditLimit(invoice?.creditLimit)}
        </Trans>
      </Text>
      <Text size="sm" textColor="muted">
        <DateTime date={getArrangementStart(arrangement)} variant="absolute" />
        {' – '}
        {arrangement.spec?.endsAt ? (
          <DateTime date={arrangement.spec.endsAt} variant="absolute" />
        ) : (
          <Trans>no end date</Trans>
        )}
      </Text>
      <Text
        size="sm"
        textColor="muted"
        className="ml-auto truncate"
        title={arrangement.spec?.reason ?? undefined}>
        {arrangement.spec?.reason}
      </Text>
    </li>
  );
}

type PaymentTermsFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitText: string;
  currency: string;
  defaultValues: PaymentTermsFormValues;
  showStart: boolean;
  onSubmit: (values: PaymentTermsFormValues) => Promise<void>;
};

export function PaymentTermsFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitText,
  currency,
  defaultValues,
  showStart,
  onSubmit,
}: PaymentTermsFormDialogProps) {
  const { t } = useLingui();
  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitText={submitText}
      cancelText={t`Cancel`}
      schema={paymentTermsFormSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}>
      <Form.Field
        name="netDays"
        label={t`Net days`}
        description={t`Days after the invoice date that payment is due.`}
        required>
        <Form.Input type="number" />
      </Form.Field>
      <Form.Field
        name="creditLimit"
        label={currency ? t`Credit limit (${currency})` : t`Credit limit`}
        description={t`The most the account should spend each billing cycle. Recorded for finance only: usage isn't capped and no alerts are sent yet.`}
        required>
        <Form.Input placeholder="10000" inputMode="decimal" />
      </Form.Field>
      <Form.Field
        name="accountsPayableEmail"
        label={t`Accounts payable email`}
        description={t`Receives invoices as well as the billing contact.`}>
        <Form.Input type="email" />
      </Form.Field>
      <Form.Field name="purchaseOrderNumber" label={t`PO number`}>
        <Form.Input />
      </Form.Field>
      <Form.Field
        name="agreementReference"
        label={t`Agreement reference`}
        description={t`A signed MSA or order form, if there is one. Otherwise our standard terms apply.`}>
        <Form.Input />
      </Form.Field>
      {showStart ? (
        <Form.Field
          name="startsAt"
          label={t`Start date`}
          description={t`Leave empty to start immediately.`}>
          <Form.DateTimePicker modal showTimezoneIndicator />
        </Form.Field>
      ) : null}
      <Form.Field
        name="endsAt"
        label={t`End date`}
        description={t`Leave empty for terms with no fixed end.`}>
        <Form.DateTimePicker modal showTimezoneIndicator />
      </Form.Field>
      <Form.Field
        name="reason"
        label={t`Reason (internal)`}
        description={t`Why these terms were granted. Never shown to the customer.`}
        required>
        <Form.Textarea placeholder={t`For example: signed MSA after sales call on 1 October`} />
      </Form.Field>
    </DialogForm>
  );
}
