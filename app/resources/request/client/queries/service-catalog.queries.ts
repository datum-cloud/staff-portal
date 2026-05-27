import {
  decideServiceConsumer,
  deleteServiceEntitlement,
  getService,
  listServiceConfigurationsForService,
  listServiceConsumersInProject,
  listServices,
  type ApprovalDecision,
} from '../apis/service-catalog.api';
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
  consumers: {
    inProject: (project: string) => ['service-catalog', 'consumers', 'project', project] as const,
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

export const useServiceConsumersInProjectQuery = (projectName: string | undefined) => {
  const project = projectName ?? '';
  return useQuery({
    queryKey: serviceCatalogQueryKeys.consumers.inProject(project),
    queryFn: () => listServiceConsumersInProject(project),
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
      await queryClient.invalidateQueries({
        queryKey: serviceCatalogQueryKeys.consumers.inProject(producerProject),
      });
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
      await queryClient.invalidateQueries({
        queryKey: serviceCatalogQueryKeys.consumers.inProject(projectName),
      });
    },
  });
};
