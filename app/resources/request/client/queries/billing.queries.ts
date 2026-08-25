import {
  billingAccountBindingListForOrgQuery,
  billingAccountBindingListQuery,
  billingAccountDetailQuery,
  billingAccountListForOrgQuery,
  billingAccountListQuery,
  billingEntitlementForAccountQuery,
  createOffer,
  offerDetailQuery,
  offerListQuery,
  paymentMethodListForOrgQuery,
  paymentMethodListQuery,
  publishOffer,
  servicePricingListQuery,
  switchBillingEntitlementOffer,
  updateDraftOffer,
  updateOfferDisplayName,
  type CreateOfferInput,
} from '../apis/billing.api';
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
