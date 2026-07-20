import {
  billingAccountBindingListForOrgQuery,
  billingAccountBindingListQuery,
  billingAccountDetailQuery,
  billingAccountListForOrgQuery,
  billingAccountListQuery,
  paymentMethodListForOrgQuery,
} from '../apis/billing.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const billingQueryKeys = {
  all: ['billing-accounts'] as const,
  list: (params?: ListQueryParams) => ['billing-accounts', 'list', params] as const,
  orgList: (orgName: string) => ['billing-accounts', 'org', orgName] as const,
  detail: (orgName: string, accountName: string) =>
    ['billing-accounts', 'detail', orgName, accountName] as const,
  bindings: (orgName: string) => ['billing-accounts', 'bindings', orgName] as const,
  bindingsAll: ['billing-accounts', 'bindings', 'all'] as const,
  paymentMethods: (orgName: string) => ['billing-accounts', 'payment-methods', orgName] as const,
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
