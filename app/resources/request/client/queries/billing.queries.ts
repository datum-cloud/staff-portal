import {
  billingAccountBindingListForOrgQuery,
  billingAccountBindingListQuery,
  billingAccountDetailQuery,
  billingAccountListForOrgQuery,
  billingAccountListQuery,
  billingArrangementApplicationDetailQuery,
  billingArrangementApplicationListForOrgQuery,
  listAllBillingArrangementApplications,
  billingArrangementDeclineListForOrgQuery,
  billingArrangementListForOrgQuery,
  billingEntitlementForAccountQuery,
  createBillingArrangement,
  createBillingArrangementDecline,
  createOffer,
  offerDetailQuery,
  offerListQuery,
  paymentMethodListForOrgQuery,
  paymentMethodListQuery,
  patchBillingArrangement,
  publishOffer,
  servicePricingListQuery,
  switchBillingEntitlementOffer,
  updateDraftOffer,
  updateOfferDisplayName,
  type CreateOfferInput,
} from '../apis/billing.api';
import type {
  ArrangementMergePatch,
  BillingArrangementSpec,
} from '@/features/billing/lib/payment-terms';
import {
  getApplicationPhase,
  type BillingArrangementApplication,
  type BillingArrangementDeclineSpec,
} from '@/features/billing/lib/payment-terms-applications';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const billingQueryKeys = {
  all: ['billing-accounts'] as const,
  list: (params?: ListQueryParams) => ['billing-accounts', 'list', params] as const,
  orgList: (orgName: string) => ['billing-accounts', 'org', orgName] as const,
  detail: (orgName: string, accountName: string) =>
    ['billing-accounts', 'detail', orgName, accountName] as const,
  bindings: (orgName: string) => ['billing-accounts', 'bindings', orgName] as const,
  bindingsAll: ['billing-accounts', 'bindings', 'all'] as const,
  paymentMethods: (orgName: string) => ['billing-accounts', 'payment-methods', orgName] as const,
  paymentMethodsAll: ['billing-accounts', 'payment-methods', 'all'] as const,
  offers: {
    all: ['offers'] as const,
    list: (params?: ListQueryParams) => ['offers', 'list', params] as const,
    detail: (name: string) => ['offers', 'detail', name] as const,
  },
  servicePricings: {
    list: (namespace: string) => ['service-pricings', 'list', namespace] as const,
  },
  entitlements: {
    forAccount: (orgName: string, accountName: string) =>
      ['billing-entitlements', orgName, accountName] as const,
  },
  arrangements: {
    forOrg: (orgName: string) => ['billing-arrangements', orgName] as const,
  },
  applications: {
    all: ['billing-arrangement-applications'] as const,
    list: ['billing-arrangement-applications', 'list'] as const,
    forOrg: (orgName: string) => ['billing-arrangement-applications', 'org', orgName] as const,
    detail: (orgName: string, applicationName: string) =>
      ['billing-arrangement-applications', 'detail', orgName, applicationName] as const,
  },
  declines: {
    forOrg: (orgName: string) => ['billing-arrangement-declines', orgName] as const,
  },
};

export const useBillingAccountListQuery = (params?: ListQueryParams) =>
  useQuery({
    queryKey: billingQueryKeys.list(params),
    queryFn: () => billingAccountListQuery(params),
    staleTime: 5 * 60 * 1000,
  });

export const useBillingAccountListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.orgList(orgName),
    queryFn: () => billingAccountListForOrgQuery(orgName),
    enabled: !!orgName,
    staleTime: 5 * 60 * 1000,
  });

export const useBillingAccountDetailQuery = (orgName: string, accountName: string) =>
  useQuery({
    queryKey: billingQueryKeys.detail(orgName, accountName),
    queryFn: () => billingAccountDetailQuery(orgName, accountName),
    enabled: !!orgName && !!accountName,
    staleTime: 5 * 60 * 1000,
  });

/** Cluster-wide bindings — used to attach project ids to billing account list rows. */
export const useBillingAccountBindingListQuery = () =>
  useQuery({
    queryKey: billingQueryKeys.bindingsAll,
    queryFn: () => billingAccountBindingListQuery({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

export const useBillingAccountBindingListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.bindings(orgName),
    queryFn: () => billingAccountBindingListForOrgQuery(orgName),
    enabled: !!orgName,
    staleTime: 5 * 60 * 1000,
  });

export const usePaymentMethodListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.paymentMethods(orgName),
    queryFn: () => paymentMethodListForOrgQuery(orgName),
    enabled: !!orgName,
    staleTime: 5 * 60 * 1000,
  });

/** Cluster-wide payment methods — used to attach Failed status on list views. */
export const usePaymentMethodListQuery = () =>
  useQuery({
    queryKey: billingQueryKeys.paymentMethodsAll,
    queryFn: () => paymentMethodListQuery({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

export const useOfferListQuery = (params?: ListQueryParams) =>
  useQuery({
    queryKey: billingQueryKeys.offers.list(params),
    queryFn: () => offerListQuery(params),
    staleTime: 5 * 60 * 1000,
  });

export const useOfferDetailQuery = (name: string) =>
  useQuery({
    queryKey: billingQueryKeys.offers.detail(name),
    queryFn: () => offerDetailQuery(name),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });

export const useServicePricingListQuery = (namespace?: string) =>
  useQuery({
    queryKey: billingQueryKeys.servicePricings.list(namespace ?? 'milo-system'),
    queryFn: () => servicePricingListQuery(namespace),
    staleTime: 5 * 60 * 1000,
  });

export const useBillingEntitlementForAccountQuery = (orgName: string, accountName: string) =>
  useQuery({
    queryKey: billingQueryKeys.entitlements.forAccount(orgName, accountName),
    queryFn: () => billingEntitlementForAccountQuery(orgName, accountName),
    enabled: !!orgName && !!accountName,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOfferInput) => createOffer(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.offers.all });
    },
  });
};

export const useUpdateDraftOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      ...input
    }: {
      name: string;
      displayName?: string;
      chargeTypes: CreateOfferInput['chargeTypes'];
      servicePricingRefs: CreateOfferInput['servicePricingRefs'];
      discount?: CreateOfferInput['discount'];
    }) => updateDraftOffer(name, input),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.offers.all });
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.offers.detail(variables.name),
      });
    },
  });
};

export const usePublishOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => publishOffer(name),
    onSuccess: async (_, name) => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.offers.all });
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.offers.detail(name) });
    },
  });
};

export const useUpdateOfferDisplayNameMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, displayName }: { name: string; displayName: string }) =>
      updateOfferDisplayName(name, displayName),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.offers.all });
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.offers.detail(variables.name),
      });
    },
  });
};

export const useSwitchBillingEntitlementOfferMutation = (orgName: string, accountName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entitlementName, offerName }: { entitlementName: string; offerName: string }) =>
      switchBillingEntitlementOffer(orgName, entitlementName, offerName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.entitlements.forAccount(orgName, accountName),
      });
    },
  });
};

export const useBillingArrangementListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.arrangements.forOrg(orgName),
    queryFn: () => billingArrangementListForOrgQuery(orgName, { limit: 500 }),
    enabled: !!orgName,
  });

/**
 * Granting, changing or ending payment terms also changes the billing
 * account's PaymentReady condition, so refresh both.
 */
const invalidateArrangementQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  orgName: string,
  accountName: string
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.arrangements.forOrg(orgName) }),
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.detail(orgName, accountName) }),
  ]);
};

export const useCreateBillingArrangementMutation = (orgName: string, accountName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spec: BillingArrangementSpec) => createBillingArrangement(orgName, spec),
    onSuccess: () => invalidateArrangementQueries(queryClient, orgName, accountName),
  });
};

export const usePatchBillingArrangementMutation = (orgName: string, accountName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, patch }: { name: string; patch: ArrangementMergePatch }) =>
      patchBillingArrangement(orgName, name, patch),
    onSuccess: () => invalidateArrangementQueries(queryClient, orgName, accountName),
  });
};

// ─── Payment terms applications ──────────────────────────────────────────────

/**
 * While an application waits for a decision, check for one every few
 * seconds: billing's controller sets the phase shortly after staff decide,
 * and the customer can withdraw at any time.
 */
const PENDING_APPLICATION_POLL_MS = 5_000;

const pollWhilePending = (application: BillingArrangementApplication | undefined) =>
  application && getApplicationPhase(application) === 'Pending'
    ? PENDING_APPLICATION_POLL_MS
    : false;

/** Every organization's applications, for the review queue. */
export const useBillingArrangementApplicationListQuery = () =>
  useQuery({
    queryKey: billingQueryKeys.applications.list,
    queryFn: listAllBillingArrangementApplications,
    staleTime: 30 * 1000,
  });

export const useBillingArrangementApplicationListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.applications.forOrg(orgName),
    queryFn: () => billingArrangementApplicationListForOrgQuery(orgName, { limit: 500 }),
    enabled: !!orgName,
  });

export const useBillingArrangementApplicationDetailQuery = (
  orgName: string,
  applicationName: string
) =>
  useQuery({
    queryKey: billingQueryKeys.applications.detail(orgName, applicationName),
    queryFn: () => billingArrangementApplicationDetailQuery(orgName, applicationName),
    enabled: !!orgName && !!applicationName,
    refetchInterval: (query) => pollWhilePending(query.state.data),
  });

export const useBillingArrangementDeclineListForOrgQuery = (orgName: string) =>
  useQuery({
    queryKey: billingQueryKeys.declines.forOrg(orgName),
    queryFn: () => billingArrangementDeclineListForOrgQuery(orgName, { limit: 500 }),
    enabled: !!orgName,
  });

/**
 * A decision changes the application's phase, and approving also adds terms
 * and changes the account's PaymentReady condition, so refresh all of them.
 */
const invalidateApplicationQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  orgName: string,
  accountName: string
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.applications.all }),
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.declines.forOrg(orgName) }),
    invalidateArrangementQueries(queryClient, orgName, accountName),
  ]);
};

/** Approve an application by granting terms that name it. */
export const useApproveBillingArrangementApplicationMutation = (
  orgName: string,
  accountName: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spec: BillingArrangementSpec) => createBillingArrangement(orgName, spec),
    onSuccess: () => invalidateApplicationQueries(queryClient, orgName, accountName),
  });
};

export const useDeclineBillingArrangementApplicationMutation = (
  orgName: string,
  accountName: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spec: BillingArrangementDeclineSpec) =>
      createBillingArrangementDecline(orgName, spec),
    onSuccess: () => invalidateApplicationQueries(queryClient, orgName, accountName),
  });
};
