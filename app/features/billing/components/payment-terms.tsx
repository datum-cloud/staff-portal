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
import {
  getApplicationPhase,
  getApplicationsForAccount,
  type BillingArrangementApplication,
} from '../lib/payment-terms-applications';
import { formatMoney, getAccountCurrency, parseDecimal } from '../utils';
import { ApplicationPhaseBadge } from './application-labels';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import {
  useBillingAccountDetailQuery,
  useBillingArrangementApplicationListForOrgQuery,
  useBillingArrangementListForOrgQuery,
  useCreateBillingArrangementMutation,
  usePatchBillingArrangementMutation,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router';

export const billingStatusBadge: Record<BillingStatus, { state: string }> = {
  invoice: { state: 'success' },
  card: { state: 'success' },
  'terms-scheduled': { state: 'info' },
  'terms-ended': { state: 'error' },
  'card-failing': { state: 'error' },
  'not-set-up': { state: 'error' },
  unknown: { state: 'warning' },
};

// Ended terms are a normal part of history, so grey rather than red.
export const phaseBadgeState: Record<BillingArrangementPhase, string> = {
  Active: 'active',
  Scheduled: 'info',
  Ended: 'unknown',
};

/**
 * Everything a payment terms view needs: the account's arrangements and
 * applications, how it is billed, and the grant, change and end actions.
 * Render `PaymentTermsDialogs` with the result to get the dialogs.
 */
export function usePaymentTerms(
  orgName: string,
  account: ComMiloapisBillingV1Alpha1BillingAccount
) {
  const { t } = useLingui();
  const accountName = account.metadata?.name ?? '';
  const currency = getAccountCurrency(account);

  const arrangementsQuery = useBillingArrangementListForOrgQuery(orgName);
  const applicationsQuery = useBillingArrangementApplicationListForOrgQuery(orgName);
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
  const applications = useMemo(
    () => getApplicationsForAccount(applicationsQuery.data?.items ?? [], accountName),
    [applicationsQuery.data?.items, accountName]
  );
  const pendingApplication = applications.find(
    (application) => getApplicationPhase(application) === 'Pending'
  );
  const pastApplications = applications.filter((application) => application !== pendingApplication);

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

  const formatCreditLimit = (amount?: string) => {
    const value = parseDecimal(amount);
    return value === undefined ? '—' : formatMoney(value, currency);
  };

  return {
    isLoading: arrangementsQuery.isLoading,
    currency,
    current,
    currentName,
    currentPhase,
    paymentReady,
    billingStatus,
    billingStatusLabel,
    history,
    pendingApplication,
    pastApplications,
    formatCreditLimit,
    dialogs: {
      grantOpen,
      setGrantOpen,
      changeOpen,
      setChangeOpen,
      endOpen,
      setEndOpen,
      handleGrant,
      handleChange,
      handleEnd,
    },
  };
}

export type PaymentTermsState = ReturnType<typeof usePaymentTerms>;

/** The grant, change and end dialogs for a `usePaymentTerms` result. */
export function PaymentTermsDialogs({ terms }: { terms: PaymentTermsState }) {
  const { t } = useLingui();
  const { current, currentName, currentPhase, dialogs } = terms;
  return (
    <>
      <PaymentTermsFormDialog
        open={dialogs.grantOpen}
        onOpenChange={dialogs.setGrantOpen}
        title={t`Grant payment terms`}
        description={t`The account will be billed by invoice on these terms. Overlapping terms are rejected, so end the current terms first if there are any.`}
        submitText={t`Grant`}
        defaultValues={emptyPaymentTermsForm}
        showStart
        onSubmit={dialogs.handleGrant}
      />

      {current ? (
        <PaymentTermsFormDialog
          // Remount when the current arrangement changes so defaults reload.
          key={`${currentName}-${current.metadata?.resourceVersion}`}
          open={dialogs.changeOpen}
          onOpenChange={dialogs.setChangeOpen}
          title={t`Change payment terms`}
          description={t`Changes apply to the terms currently on the account.`}
          submitText={t`Save`}
          defaultValues={paymentTermsFormFromArrangement(current)}
          showStart={currentPhase === 'Scheduled'}
          onSubmit={dialogs.handleChange}
        />
      ) : null}

      <DialogConfirm
        open={dialogs.endOpen}
        onOpenChange={dialogs.setEndOpen}
        title={currentPhase === 'Scheduled' ? t`Withdraw payment terms` : t`End payment terms`}
        description={
          currentPhase === 'Scheduled'
            ? t`These terms will never take effect. The record is kept for history.`
            : t`The account will stop being billed by invoice now and will need a card to keep using paid services. The record is kept for history.`
        }
        confirmText={currentPhase === 'Scheduled' ? t`Withdraw` : t`End terms`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={dialogs.handleEnd}
      />
    </>
  );
}

/** The customer's open application for terms, with a link to review it. */
export function PendingApplicationNotice({
  orgName,
  application,
}: {
  orgName: string;
  application: BillingArrangementApplication;
}) {
  return (
    <div
      className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2"
      data-e2e="payment-terms-pending-application">
      <Text size="sm">
        <Trans>
          The customer applied for payment terms on{' '}
          <DateTime date={application.metadata?.creationTimestamp} variant="absolute" /> and is
          waiting for a decision.
        </Trans>
      </Text>
      <Link
        to={billingAccountRoutes.applications.detail(orgName, application.metadata?.name ?? '')}
        className="text-sm font-medium">
        <Trans>Review application</Trans>
      </Link>
    </div>
  );
}

/** Earlier terms and decided applications, each under its own heading. */
export function PaymentTermsHistory({
  orgName,
  terms,
}: {
  orgName: string;
  terms: PaymentTermsState;
}) {
  return (
    <>
      {terms.history.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <Text size="sm" weight="medium" className="block">
            <Trans>Previous terms</Trans>
          </Text>
          <ul className="divide-y">
            {terms.history.map((arrangement) => (
              <ArrangementHistoryRow
                key={arrangement.metadata?.name}
                arrangement={arrangement}
                formatCreditLimit={terms.formatCreditLimit}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {terms.pastApplications.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <Text size="sm" weight="medium" className="block">
            <Trans>Applications</Trans>
          </Text>
          <ul className="divide-y">
            {terms.pastApplications.map((application) => (
              <ApplicationHistoryRow
                key={application.metadata?.name}
                orgName={orgName}
                application={application}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** Change and End (or Withdraw) buttons for the current terms. */
export function CurrentTermsActions({ terms }: { terms: PaymentTermsState }) {
  return (
    <div className="flex gap-2">
      <Button
        type="quaternary"
        theme="outline"
        size="small"
        onClick={() => terms.dialogs.setChangeOpen(true)}>
        <Trans>Change</Trans>
      </Button>
      <Button
        type="warning"
        theme="outline"
        size="small"
        onClick={() => terms.dialogs.setEndOpen(true)}>
        {terms.currentPhase === 'Scheduled' ? <Trans>Withdraw</Trans> : <Trans>End</Trans>}
      </Button>
    </div>
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
    <div className={wide ? 'col-span-2 min-w-0 @md:col-span-4' : 'min-w-0'}>
      <Text size="xs" className="text-muted-foreground block">
        {label}
      </Text>
      {/* wrap-anywhere: long emails and references wrap instead of overflowing. */}
      <Text as="div" size="sm" className="mt-0.5 wrap-anywhere">
        {children}
      </Text>
    </div>
  );
}

export function ArrangementDetails({
  arrangement,
  formatCreditLimit,
}: {
  arrangement: BillingArrangement;
  formatCreditLimit: (amount?: string) => string;
}) {
  const invoice = arrangement.spec?.invoice;
  // Sized to the card, not the window: it sits in the dashboard's narrow
  // sidebar as well as on wider pages.
  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 @md:grid-cols-4">
        <TermField label={<Trans>Net days</Trans>}>{invoice?.netDays ?? '—'}</TermField>
        {invoice?.creditLimit ? (
          <TermField label={<Trans>Credit limit</Trans>}>
            {formatCreditLimit(invoice.creditLimit)}
          </TermField>
        ) : null}
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
        <TermField label={<Trans>PO number</Trans>}>
          {invoice?.purchaseOrderNumber || '—'}
        </TermField>
        <TermField label={<Trans>Agreement</Trans>} wide>
          {invoice?.agreementReference || '—'}
        </TermField>
        <TermField label={<Trans>Reason (internal)</Trans>} wide>
          {arrangement.spec?.reason || '—'}
        </TermField>
      </div>
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
        {invoice?.creditLimit ? (
          <Trans>
            Net {invoice?.netDays ?? '—'}, limit {formatCreditLimit(invoice.creditLimit)}
          </Trans>
        ) : (
          <Trans>Net {invoice?.netDays ?? '—'}</Trans>
        )}
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

/** One line per decided or withdrawn application: outcome, who, when. */
function ApplicationHistoryRow({
  orgName,
  application,
}: {
  orgName: string;
  application: BillingArrangementApplication;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
      <ApplicationPhaseBadge application={application} />
      <Link
        to={billingAccountRoutes.applications.detail(orgName, application.metadata?.name ?? '')}
        className="text-sm">
        {application.spec?.organization?.legalName || application.metadata?.name}
      </Link>
      <Text size="sm" textColor="muted">
        <Trans>
          Submitted <DateTime date={application.metadata?.creationTimestamp} variant="absolute" />
        </Trans>
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
