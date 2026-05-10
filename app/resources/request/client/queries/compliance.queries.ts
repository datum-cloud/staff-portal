import {
  createVendor,
  deleteSubprocessor,
  deleteVendor,
  getSubprocessor,
  getVendor,
  listSubprocessors,
  listVendors,
  updateVendor,
  type VendorSpec,
} from '../apis/compliance.api';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const complianceQueryKeys = {
  all: ['compliance'] as const,
  vendors: {
    all: () => ['compliance', 'vendors'] as const,
    list: (params?: ListQueryParams) => ['compliance', 'vendors', 'list', params] as const,
    detail: (name: string) => ['compliance', 'vendors', name] as const,
  },
  subprocessors: {
    all: () => ['compliance', 'subprocessors'] as const,
    list: (params?: ListQueryParams) => ['compliance', 'subprocessors', 'list', params] as const,
    detail: (name: string) => ['compliance', 'subprocessors', name] as const,
  },
};

export const useVendorListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: complianceQueryKeys.vendors.list(params),
    queryFn: () => listVendors(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useVendorDetailQuery = (name: string) => {
  return useQuery({
    queryKey: complianceQueryKeys.vendors.detail(name),
    queryFn: () => getVendor(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

export const useCreateVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: VendorSpec }) => createVendor(name, spec),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: complianceQueryKeys.vendors.all() });
    },
  });
};

export const useUpdateVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: Partial<VendorSpec> }) =>
      updateVendor(name, spec),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: complianceQueryKeys.vendors.all() });
      await queryClient.invalidateQueries({
        queryKey: complianceQueryKeys.vendors.detail(variables.name),
      });
    },
  });
};

export const useDeleteVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteVendor(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: complianceQueryKeys.vendors.all() });
    },
  });
};

export const useSubprocessorListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: complianceQueryKeys.subprocessors.list(params),
    queryFn: () => listSubprocessors(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubprocessorDetailQuery = (name: string) => {
  return useQuery({
    queryKey: complianceQueryKeys.subprocessors.detail(name),
    queryFn: () => getSubprocessor(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

export const useDeleteSubprocessorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteSubprocessor(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: complianceQueryKeys.subprocessors.all(),
      });
    },
  });
};
