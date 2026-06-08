import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';

export const BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION = 'kubernetes.io/display-name';

export const getOrganizationDisplayName = (org: {
  metadata?: { name?: string; annotations?: Record<string, string> };
}): string =>
  org.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ??
  org.metadata?.name ??
  '';

export const buildOrganizationNamespace = (orgName: string) => `organization-${orgName}`;

export const orgNameFromNamespace = (namespace?: string): string => {
  if (!namespace) return '';
  const prefix = 'organization-';
  return namespace.startsWith(prefix) ? namespace.slice(prefix.length) : namespace;
};

export const getBillingAccountDisplayName = (
  account: ComMiloapisBillingV1Alpha1BillingAccount
): string =>
  account.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ??
  account.spec?.contactInfo?.businessName ??
  account.spec?.contactInfo?.name ??
  account.metadata?.name ??
  'Unnamed billing account';

export const isDefaultPaymentMethod = (
  method: ComMiloapisBillingV1Alpha1PaymentMethod,
  account: ComMiloapisBillingV1Alpha1BillingAccount | undefined
): boolean => account?.spec?.defaultPaymentMethodRef?.name === method.metadata?.name;

export const getActiveProjectBinding = (
  bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[],
  projectName: string
): ComMiloapisBillingV1Alpha1BillingAccountBinding | undefined =>
  bindings.find(
    (binding) =>
      binding.spec?.projectRef?.name === projectName &&
      (!binding.status?.phase || binding.status.phase === 'Active')
  );

export const getActiveBindingsForAccount = (
  bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[],
  accountName: string
): ComMiloapisBillingV1Alpha1BillingAccountBinding[] =>
  bindings.filter(
    (binding) =>
      binding.spec?.billingAccountRef?.name === accountName &&
      (!binding.status?.phase || binding.status.phase === 'Active')
  );

export const formatBillingAddress = (
  address: NonNullable<
    NonNullable<ComMiloapisBillingV1Alpha1BillingAccount['spec']>['contactInfo']
  >['address']
): string => {
  if (!address) return '';
  return [
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(', '),
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join('\n');
};
