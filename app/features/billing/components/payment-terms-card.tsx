import {
  buildArrangementPatch,
  buildArrangementSpec,
  buildEndArrangementPatch,
  emptyPaymentTermsForm,
  getArrangementPhase,
  getArrangementStart,
  getArrangementsForAccount,
  getCurrentArrangement,
  getPaymentReadyCondition,
  paymentTermsFormFromArrangement,
  paymentTermsFormSchema,
  type BillingArrangement,
  type BillingArrangementPhase,
  type PaymentTermsFormValues,
} from '../lib/payment-terms';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
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
import { useMemo, useState } from 'react';

type PaymentTermsCardProps = {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
};

const phaseBadgeState: Record<BillingArrangementPhase, string> = {
  Active: 'active',
  Scheduled: 'pending',
  Ended: 'inactive',
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
        description={
          <Trans>
            Let this account pay by invoice instead of by card. Terms you grant are effective
            immediately unless you set a start date.
          </Trans>
        }
        action={
          <Button type="primary" size="small" onClick={() => setGrantOpen(true)}>
            <Trans>Grant payment terms</Trans>
          </Button>
        }>
        {arrangementsQuery.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DescriptionList
              items={[
                {
                  label: <Trans>Can be billed</Trans>,
                  value: paymentReady ? (
                    <BadgeState
                      state={
                        paymentReady.status === 'True'
                          ? 'success'
                          : paymentReady.status === 'False'
                            ? 'error'
                            : 'warning'
                      }
                      message={paymentReady.reason}
                      tooltip={paymentReady.message}
                    />
                  ) : (
                    <Text>—</Text>
                  ),
                },
              ]}
            />

            {current && currentPhase ? (
              <div className="bg-muted/40 rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BadgeState
                      state={phaseBadgeState[currentPhase]}
                      message={currentPhase === 'Active' ? t`Active` : t`Scheduled`}
                    />
                    <Text size="sm" weight="medium">
                      <Trans>Pay by invoice</Trans>
                    </Text>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="tertiary"
                      theme="outline"
                      size="small"
                      onClick={() => setChangeOpen(true)}>
                      <Trans>Change terms</Trans>
                    </Button>
                    <Button
                      type="warning"
                      theme="outline"
                      size="small"
                      onClick={() => setEndOpen(true)}>
                      {currentPhase === 'Scheduled' ? (
                        <Trans>Withdraw</Trans>
                      ) : (
                        <Trans>End terms</Trans>
                      )}
                    </Button>
                  </div>
                </div>
                <ArrangementDetails arrangement={current} formatCreditLimit={formatCreditLimit} />
              </div>
            ) : (
              <Text size="sm" className="text-muted-foreground">
                <Trans>
                  No payment terms are in effect. The account needs an active card to be billed.
                </Trans>
              </Text>
            )}

            {history.length > 0 ? (
              <div>
                <Text size="sm" weight="medium" className="mb-2 block">
                  <Trans>History</Trans>
                </Text>
                <div className="flex flex-col gap-2">
                  {history.map((arrangement) => {
                    const phase = getArrangementPhase(arrangement);
                    return (
                      <div
                        key={arrangement.metadata?.name}
                        className="bg-muted/20 rounded-md border p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <BadgeState
                            state={phaseBadgeState[phase]}
                            message={phase}
                            variant="dot"
                          />
                          <Text textColor="muted" size="sm" className="font-mono text-xs">
                            {arrangement.metadata?.name}
                          </Text>
                        </div>
                        <ArrangementDetails
                          arrangement={arrangement}
                          formatCreditLimit={formatCreditLimit}
                        />
                      </div>
                    );
                  })}
                </div>
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

function ArrangementDetails({
  arrangement,
  formatCreditLimit,
}: {
  arrangement: BillingArrangement;
  formatCreditLimit: (amount?: string) => string;
}) {
  const invoice = arrangement.spec?.invoice;
  return (
    <DescriptionList
      labelWidth="40%"
      items={[
        {
          label: <Trans>Net days</Trans>,
          value: <Text size="sm">{invoice?.netDays ?? '—'}</Text>,
        },
        {
          label: <Trans>Credit limit</Trans>,
          value: <Text size="sm">{formatCreditLimit(invoice?.creditLimit)}</Text>,
        },
        {
          label: <Trans>Starts</Trans>,
          value: <DateTime date={getArrangementStart(arrangement)} variant="both" />,
        },
        {
          label: <Trans>Ends</Trans>,
          value: arrangement.spec?.endsAt ? (
            <DateTime date={arrangement.spec.endsAt} variant="both" />
          ) : (
            <Text size="sm">
              <Trans>No end date</Trans>
            </Text>
          ),
        },
        {
          label: <Trans>Invoices to</Trans>,
          value: <Text size="sm">{invoice?.accountsPayableEmail || '—'}</Text>,
        },
        {
          label: <Trans>PO number</Trans>,
          value: <Text size="sm">{invoice?.purchaseOrderNumber || '—'}</Text>,
        },
        {
          label: <Trans>Agreement</Trans>,
          value: <Text size="sm">{invoice?.agreementReference || '—'}</Text>,
        },
        {
          label: <Trans>Reason (internal)</Trans>,
          value: <Text size="sm">{arrangement.spec?.reason || '—'}</Text>,
        },
      ]}
    />
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
