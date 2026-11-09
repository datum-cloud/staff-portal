import { useAccountPaymentMethods } from '../../hooks';
import { getBillingMode } from '../../lib/payment-terms';
import {
  getPaymentMethodDisplayName,
  isDefaultPaymentMethod,
  type BillingAccount,
  type PaymentMethod,
} from '../../utils';
import { CardBrandIcon, formatCardLabel } from '../card-brand-icon';
import {
  ArrangementDetails,
  CurrentTermsActions,
  PaymentTermsDialogs,
  PaymentTermsHistory,
  PendingApplicationNotice,
  billingStatusBadge,
  phaseBadgeState,
  type PaymentTermsState,
} from '../payment-terms';
import { BILLING_ACCOUNT_SECTION_IDS, CardQueryState, SectionAnchor } from './card-parts';
import { BadgeState } from '@/components/badge';
import { SectionCard } from '@/features/milo';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

interface PaymentCardProps {
  orgName: string;
  account: BillingAccount;
  /** From `usePaymentTerms`, held by the page so its header can open the dialogs. */
  terms: PaymentTermsState;
}

const cardExpiry = (card: { expiryMonth?: number; expiryYear?: number }): string | undefined =>
  card.expiryMonth && card.expiryYear
    ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
    : undefined;

/**
 * How the account pays: how it is billed, its cards, and its payment terms,
 * with the grant, change and end actions from the payment terms card.
 */
export function BillingAccountPaymentCard({ orgName, account, terms }: PaymentCardProps) {
  const {
    paymentMethods,
    isLoading: methodsLoading,
    isError: methodsError,
  } = useAccountPaymentMethods(orgName, account);
  // Default card first.
  const methods = useMemo(
    () =>
      [...(paymentMethods ?? [])].sort(
        (a, b) =>
          Number(isDefaultPaymentMethod(b, account)) - Number(isDefaultPaymentMethod(a, account))
      ),
    [paymentMethods, account]
  );

  return (
    <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.paymentTerms}>
      <SectionCard
        title={<Trans>Payment</Trans>}
        contentClassName="flex flex-col gap-4"
        // Grant sits in the terms summary when there are none; existing terms
        // are changed or ended there, so the header has no action.
      >
        {terms.isLoading ? (
          <Skeleton className="h-5 w-48 rounded" />
        ) : (
          <BilledBy account={account} terms={terms} />
        )}

        <CardQueryState
          isLoading={methodsLoading}
          isError={methodsError}
          isEmpty={methods.length === 0}
          skeleton={<Skeleton className="h-14 w-full rounded-md" />}
          error={<Trans>Couldn&apos;t load payment methods</Trans>}
          empty={
            // An account on invoice terms pays by transfer, so no card is fine.
            terms.current ? (
              <Trans>No card on file. Not needed while invoice terms are active.</Trans>
            ) : (
              <Trans>No payment method on file</Trans>
            )
          }>
          <ul className="flex flex-col gap-2">
            {methods.map((method) => (
              <PaymentMethodRow
                key={method.metadata?.name}
                method={method}
                isDefault={isDefaultPaymentMethod(method, account)}
              />
            ))}
          </ul>
        </CardQueryState>

        {terms.isLoading ? (
          <Skeleton className="h-16 w-full rounded-md" />
        ) : (
          <>
            {terms.pendingApplication ? (
              <PendingApplicationNotice orgName={orgName} application={terms.pendingApplication} />
            ) : null}
            {/* While the customer's application waits, review it rather than grant terms. */}
            {terms.current || !terms.pendingApplication ? <TermsSummary terms={terms} /> : null}
            <PaymentTermsHistory orgName={orgName} terms={terms} />
          </>
        )}
      </SectionCard>
      <PaymentTermsDialogs terms={terms} />
    </SectionAnchor>
  );
}

function BilledBy({ account, terms }: { account: BillingAccount; terms: PaymentTermsState }) {
  const { billingStatus } = terms;
  const mode = getBillingMode(account);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Text as="span" size="sm" textColor="muted">
        <Trans>Billed by</Trans>
      </Text>
      <BadgeState
        state={billingStatusBadge[billingStatus].state}
        message={terms.billingStatusLabel[billingStatus]}
        tooltip={terms.paymentReady?.message}
      />
      {/* A failing card is still card billing, but nothing is being charged. */}
      {mode === 'card' && billingStatus !== 'card-failing' ? (
        <Text as="span" size="sm" textColor="muted">
          <Trans>auto-charged when invoiced</Trans>
        </Text>
      ) : mode === 'invoice' ? (
        <Text as="span" size="sm" textColor="muted">
          <Trans>pays invoices on terms</Trans>
        </Text>
      ) : null}
    </div>
  );
}

function PaymentMethodRow({ method, isDefault }: { method: PaymentMethod; isDefault: boolean }) {
  const card = method.status?.details?.card;
  const expiry = card ? cardExpiry(card) : undefined;

  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2.5">
      <CardBrandIcon brand={card?.brand} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Text size="sm" weight="medium" ellipsis>
          {formatCardLabel(card, getPaymentMethodDisplayName(method))}
        </Text>
        <Text size="xs" textColor="muted" ellipsis>
          {[
            getPaymentMethodDisplayName(method),
            expiry ? t`expires ${expiry}` : undefined,
            isDefault ? t`Default` : undefined,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </div>
      <BadgeState state={method.status?.phase ?? 'Unknown'} />
    </li>
  );
}

function TermsSummary({ terms }: { terms: PaymentTermsState }) {
  const { current, currentPhase, billingStatus } = terms;

  if (current && currentPhase) {
    return (
      <div className="bg-background flex flex-col gap-3 rounded-md p-3">
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
          <CurrentTermsActions terms={terms} />
        </div>
        <ArrangementDetails arrangement={current} formatCreditLimit={terms.formatCreditLimit} />
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-wrap items-center justify-between gap-3 rounded-md p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="sm" weight="medium">
          <Trans>No payment terms</Trans>
        </Text>
        <Text size="xs" textColor="muted">
          {billingStatus === 'card' ? (
            <Trans>Pays by card. Invoice billing (net terms, PO) isn&apos;t granted.</Trans>
          ) : (
            <Trans>Grant terms to let this account be billed by invoice.</Trans>
          )}
        </Text>
      </div>
      <Button
        type="quaternary"
        theme="outline"
        size="small"
        onClick={() => terms.dialogs.setGrantOpen(true)}>
        <Trans>Grant terms</Trans>
      </Button>
    </div>
  );
}
