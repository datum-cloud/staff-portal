import { env } from '@/utils/config/env.server';

/**
 * Returns the base URL for requests to an organization's control plane.
 *
 * BillingAccountBinding, BillingAccount, quota grants, etc. live in the
 * organization namespace and are served through this proxy path.
 */
export const getOrgControlPlaneBaseURL = (orgName: string) =>
  `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

/**
 * Returns the base URL for requests to a project's control plane.
 */
export const getProjectControlPlaneBaseURL = (projectName: string) =>
  `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`;
