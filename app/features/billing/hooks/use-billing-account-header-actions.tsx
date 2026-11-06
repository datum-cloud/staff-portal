import type { BillingAccountHeaderAction } from '../components/billing-account-dashboard/billing-account-header';
import type { PaymentTermsState } from '../components/payment-terms';
import type { BillingAccount } from '../utils';
import { useBillingEntitlementForAccountQuery } from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from 'react-router';

/**
 * The billing account header's Actions menu: grant or change terms (or
 * review the customer's pending application instead), switch offer, and set
 * up a contract or change its fees.
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
          label: <Trans>Change contract fees</Trans>,
          onSelect: () => navigate(billingAccountRoutes.contract(orgName, accountName)),
        }
      : {
          key: 'contract',
          label: <Trans>Set up contract</Trans>,
          // The contract goes on the account's entitlement.
          disabled: !entitlementQuery.data,
          onSelect: () => navigate(billingAccountRoutes.contract(orgName, accountName)),
        },
  ];
}
