import { ListQueryParams } from '@/resources/schemas';
import {
  createComplianceMiloapisComV1Alpha1Vendor,
  deleteComplianceMiloapisComV1Alpha1Subprocessor,
  deleteComplianceMiloapisComV1Alpha1Vendor,
  listComplianceMiloapisComV1Alpha1Subprocessor,
  listComplianceMiloapisComV1Alpha1Vendor,
  patchComplianceMiloapisComV1Alpha1Vendor,
  readComplianceMiloapisComV1Alpha1Subprocessor,
  readComplianceMiloapisComV1Alpha1Vendor,
  type ComMiloapisComplianceV1Alpha1Subprocessor,
  type ComMiloapisComplianceV1Alpha1SubprocessorList,
  type ComMiloapisComplianceV1Alpha1Vendor,
  type ComMiloapisComplianceV1Alpha1VendorList,
} from '@openapi/compliance.miloapis.com/v1alpha1';

export type Vendor = ComMiloapisComplianceV1Alpha1Vendor;
export type VendorSpec = ComMiloapisComplianceV1Alpha1Vendor['spec'];
export type Subprocessor = ComMiloapisComplianceV1Alpha1Subprocessor;

export const listVendors = async (
  params?: ListQueryParams
): Promise<ComMiloapisComplianceV1Alpha1VendorList | null> => {
  const response = await listComplianceMiloapisComV1Alpha1Vendor({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data ?? null;
};

export const getVendor = async (name: string): Promise<Vendor | null> => {
  const response = await readComplianceMiloapisComV1Alpha1Vendor({
    path: { name },
  });
  return response.data.data ?? null;
};

export const createVendor = async (name: string, spec: VendorSpec) => {
  const response = await createComplianceMiloapisComV1Alpha1Vendor({
    body: {
      apiVersion: 'compliance.miloapis.com/v1alpha1',
      kind: 'Vendor',
      metadata: { name },
      spec,
    },
  });
  return response.data.data;
};

export const updateVendor = async (name: string, spec: Partial<VendorSpec>) => {
  const response = await patchComplianceMiloapisComV1Alpha1Vendor({
    path: { name },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return response.data.data;
};

export const deleteVendor = async (name: string) => {
  return deleteComplianceMiloapisComV1Alpha1Vendor({
    path: { name },
  });
};

export const listSubprocessors = async (
  params?: ListQueryParams
): Promise<ComMiloapisComplianceV1Alpha1SubprocessorList | null> => {
  const response = await listComplianceMiloapisComV1Alpha1Subprocessor({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data ?? null;
};

export const getSubprocessor = async (name: string): Promise<Subprocessor | null> => {
  const response = await readComplianceMiloapisComV1Alpha1Subprocessor({
    path: { name },
  });
  return response.data.data ?? null;
};

export const deleteSubprocessor = async (name: string) => {
  return deleteComplianceMiloapisComV1Alpha1Subprocessor({
    path: { name },
  });
};
