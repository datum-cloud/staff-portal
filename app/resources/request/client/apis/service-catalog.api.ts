import { PROXY_URL } from '@/modules/axios/axios.client';
import {
  deleteServicesMiloapisComV1Alpha1ServiceEntitlement,
  listServicesMiloapisComV1Alpha1Service,
  listServicesMiloapisComV1Alpha1ServiceConfiguration,
  listServicesMiloapisComV1Alpha1ServiceConsumer,
  patchServicesMiloapisComV1Alpha1ServiceConsumer,
  readServicesMiloapisComV1Alpha1Service,
  type ComMiloapisServicesV1Alpha1Service,
  type ComMiloapisServicesV1Alpha1ServiceConfiguration,
  type ComMiloapisServicesV1Alpha1ServiceConfigurationList,
  type ComMiloapisServicesV1Alpha1ServiceConsumer,
  type ComMiloapisServicesV1Alpha1ServiceConsumerList,
  type ComMiloapisServicesV1Alpha1ServiceList,
} from '@openapi/services.miloapis.com/v1alpha1';

export type Service = ComMiloapisServicesV1Alpha1Service;
export type ServiceList = ComMiloapisServicesV1Alpha1ServiceList;
export type ServiceConfiguration = ComMiloapisServicesV1Alpha1ServiceConfiguration;
export type ServiceConfigurationList = ComMiloapisServicesV1Alpha1ServiceConfigurationList;
export type ServiceConsumer = ComMiloapisServicesV1Alpha1ServiceConsumer;
export type ServiceConsumerList = ComMiloapisServicesV1Alpha1ServiceConsumerList;
export type ApprovalDecision = 'Approved' | 'Denied';

export const listServices = async (): Promise<ServiceList | null> => {
  const response = await listServicesMiloapisComV1Alpha1Service();
  return response.data.data ?? null;
};

export const getService = async (name: string): Promise<Service | null> => {
  const response = await readServicesMiloapisComV1Alpha1Service({
    path: { name },
  });
  return response.data.data ?? null;
};

// The aggregated apiserver does not index spec.serviceRef.name (or status.phase)
// as field selectors, so list calls return everything and the caller filters
// client-side. The serviceName argument is kept on the signature to keep the
// queryKey stable per service.
export const listServiceConfigurationsForService = async (
  _serviceName: string
): Promise<ServiceConfigurationList | null> => {
  const response = await listServicesMiloapisComV1Alpha1ServiceConfiguration();
  return response.data.data ?? null;
};

// ServiceConsumer lives in the producer project's control plane (the project
// that owns the Service), not at the platform level. Callers must pass the
// producer project name so we can scope the request via the control-plane
// proxy.
const projectScope = (projectName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`;

export const listServiceConsumersInProject = async (
  projectName: string
): Promise<ServiceConsumerList | null> => {
  if (!projectName) return null;
  const response = await listServicesMiloapisComV1Alpha1ServiceConsumer({
    baseURL: projectScope(projectName),
  });
  return response.data.data ?? null;
};

// Revoke a consumer's access by deleting the ServiceEntitlement in the
// consumer's project. The controller reconciles this into removal of the
// downstream ServiceConsumer record in the producer's project.
export const deleteServiceEntitlement = async (
  consumerProjectName: string,
  entitlementName: string
) => {
  const response = await deleteServicesMiloapisComV1Alpha1ServiceEntitlement({
    baseURL: projectScope(consumerProjectName),
    path: { name: entitlementName },
  });
  return response.data.data;
};

export const decideServiceConsumer = async (
  projectName: string,
  consumerName: string,
  decision: ApprovalDecision,
  message?: string
) => {
  const response = await patchServicesMiloapisComV1Alpha1ServiceConsumer({
    baseURL: projectScope(projectName),
    path: { name: consumerName },
    query: { fieldManager: 'datum-staff-portal' },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: {
      spec: {
        approval: {
          decision,
          ...(message ? { message } : {}),
        },
      },
    },
  });
  return response.data.data;
};
