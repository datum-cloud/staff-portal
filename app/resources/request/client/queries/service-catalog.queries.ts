import {
  decideServiceConsumer,
  deleteServiceEntitlement,
  getBillingDefaultOffer,
  getService,
  listServiceConfigurationsForService,
  listServiceConsumersInProject,
  listServices,
  setBillingDefaultOffer,
  type ApprovalDecision,
} from '../apis/service-catalog.api';
import { listServiceConsumers } from '@/modules/graphql/service-consumers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const serviceCatalogQueryKeys = {
  all: ['service-catalog'] as const,
  services: {
    all: () => ['service-catalog', 'services'] as const,
    detail: (name: string) => ['service-catalog', 'services', name] as const,
  },
  configurations: {
    forService: (name: string) =>
      ['service-catalog', 'configurations', 'forService', name] as const,
  },
  billingDefaultOffer: ['service-catalog', 'billing-default-offer'] as const,
  consumers: {
    inProject: (project: string) => ['service-catalog', 'consumers', 'project', project] as const,
    // Gateway-enriched variant (adds consumer project display names), used by
    // the Consumers table. Keyed separately from the raw REST list so both can
    // coexist; mutations below invalidate both.
    enriched: (project: string) => ['service-catalog', 'consumers', 'enriched', project] as const,
  },
};

export const useServiceListQuery = () => {
  return useQuery({
    queryKey: serviceCatalogQueryKeys.services.all(),
    queryFn: listServices,
    staleTime: 5 * 60 * 1000,
  });
};

export const useServiceDetailQuery = (name: string) => {
  return useQuery({
    queryKey: serviceCatalogQueryKeys.services.detail(name),
    queryFn: () => getService(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

export const useServiceConfigurationsByServiceQuery = (serviceName: string) => {
  return useQuery({
    queryKey: serviceCatalogQueryKeys.configurations.forService(serviceName),
    queryFn: () => listServiceConfigurationsForService(serviceName),
    enabled: !!serviceName,
    staleTime: 60 * 1000,
  });
};

export const useBillingDefaultOfferQuery = () => {
  return useQuery({
    queryKey: serviceCatalogQueryKeys.billingDefaultOffer,
    queryFn: getBillingDefaultOffer,
    staleTime: 60 * 1000,
  });
};

export const useSetBillingDefaultOfferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { offerName: string; migrateFromOffer?: string | null }) =>
      setBillingDefaultOffer(input.offerName, { migrateFromOffer: input.migrateFromOffer }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: serviceCatalogQueryKeys.billingDefaultOffer,
      });
    },
  });
};

export const useServiceConsumersInProjectQuery = (projectName: string | undefined) => {
  const project = projectName ?? '';
  return useQuery({
    queryKey: serviceCatalogQueryKeys.consumers.inProject(project),
    queryFn: () => listServiceConsumersInProject(project),
    enabled: !!project,
    staleTime: 30 * 1000,
  });
};

// Gateway-enriched consumer list (includes each consumer project's display
// name). Used by the Consumers table; resolved server-side in one round trip.
export const useServiceConsumersEnrichedQuery = (projectName: string | undefined) => {
  const project = projectName ?? '';
  return useQuery({
    queryKey: serviceCatalogQueryKeys.consumers.enriched(project),
    queryFn: () => listServiceConsumers(project),
    enabled: !!project,
    staleTime: 30 * 1000,
  });
};

export const useRevokeServiceEntitlementMutation = (producerProject: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      consumerProject,
      entitlementName,
    }: {
      consumerProject: string;
      entitlementName: string;
    }) => deleteServiceEntitlement(consumerProject, entitlementName),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: serviceCatalogQueryKeys.consumers.inProject(producerProject),
        }),
        queryClient.invalidateQueries({
          queryKey: serviceCatalogQueryKeys.consumers.enriched(producerProject),
        }),
      ]);
    },
  });
};

export const useDecideServiceConsumerMutation = (projectName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      consumerName,
      decision,
      message,
    }: {
      consumerName: string;
      decision: ApprovalDecision;
      message?: string;
    }) => decideServiceConsumer(projectName, consumerName, decision, message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: serviceCatalogQueryKeys.consumers.inProject(projectName),
        }),
        queryClient.invalidateQueries({
          queryKey: serviceCatalogQueryKeys.consumers.enriched(projectName),
        }),
      ]);
    },
  });
};
