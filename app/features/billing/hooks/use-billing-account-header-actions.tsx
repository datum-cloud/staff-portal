import type { BillingAccountHeaderAction } from '../components/billing-account-dashboard/billing-account-header';
import type { PaymentTermsState } from '../components/payment-terms';
import type { BillingAccount } from '../utils';
import {
  useBillingEntitlementForAccountQuery,
  useContractDraftQuery,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from 'react-router';

/**
 * The billing account header's Actions menu: grant or change terms (or
 * review the customer's pending application instead), switch offer, and set
 * up a contract or change its fees, or edit the draft of either.
 */
export function useBillingAccountHeaderActions({
  orgName,
  account,
  paymentTerms,
  onSwitchOffer,
}: {
  orgName: string;
  account: BillingAccount;
  paymentTerms: PaymentTermsState;
  onSwitchOffer: () => void;
}): BillingAccountHeaderAction[] {
  const navigate = useNavigate();
  const accountName = account.metadata?.name ?? '';
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  // With a draft saved, the editor opens on it.
  const hasDraft = Boolean(useContractDraftQuery(orgName, accountName).data);
  const pendingApplicationName = paymentTerms.pendingApplication?.metadata?.name;

  const termsAction: BillingAccountHeaderAction =
    !paymentTerms.current && pendingApplicationName
      ? {
          key: 'payment-terms',
          label: <Trans>Review terms application</Trans>,
          onSelect: () =>
            navigate(billingAccountRoutes.applications.detail(orgName, pendingApplicationName)),
        }
      : paymentTerms.current
        ? {
            key: 'payment-terms',
            label: <Trans>Change payment terms</Trans>,
            disabled: paymentTerms.isLoading,
            onSelect: () => paymentTerms.dialogs.setChangeOpen(true),
          }
        : {
            key: 'payment-terms',
            label: <Trans>Grant payment terms</Trans>,
            disabled: paymentTerms.isLoading,
            onSelect: () => paymentTerms.dialogs.setGrantOpen(true),
          };

  return [
    termsAction,
    {
      key: 'offer',
      label: <Trans>Switch offer</Trans>,
      // There's nothing to switch until the account has an entitlement.
      disabled: !entitlementQuery.data,
      onSelect: onSwitchOffer,
    },
    entitlementQuery.data?.spec?.contract
      ? {
          key: 'contract',
          label: hasDraft ? (
            <Trans>Edit draft fee change</Trans>
          ) : (
            <Trans>Change contract fees</Trans>
          ),
          onSelect: () => navigate(billingAccountRoutes.contract(orgName, accountName)),
        }
      : {
          key: 'contract',
          label: hasDraft ? <Trans>Edit draft contract</Trans> : <Trans>Set up contract</Trans>,
          // The contract goes on the account's entitlement, or creates one
          // for an account without (the query's null), so it waits to know
          // which: undefined while loading or if loading failed.
          disabled: entitlementQuery.data === undefined,
          onSelect: () => navigate(billingAccountRoutes.contract(orgName, accountName)),
        },
  ];
}
