import { getActiveBindingsForAccount, type BillingAccount } from '../utils';
import type { LoadState } from './load-state';
import {
  useBillingAccountBindingListForOrgQuery,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import type { ComMiloapisBillingV1Alpha1BillingAccountBinding } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';

export interface AccountProject {
  binding: ComMiloapisBillingV1Alpha1BillingAccountBinding;
  projectName: string;
  /** The project's display name once the org's projects load, else its name. */
  displayName: string;
}

export interface AccountProjects extends LoadState {
  /** Projects actively bound to the account; `undefined` until bindings load. */
  projects?: AccountProject[];
}

/** Projects billed to the account, with their display names. */
export function useAccountProjects(orgName: string, account: BillingAccount): AccountProjects {
  const accountName = account.metadata?.name ?? '';
  const bindingsQuery = useBillingAccountBindingListForOrgQuery(orgName);
  const projectsQuery = useOrgProjectListQuery(orgName);

  const projects = useMemo(() => {
    if (!bindingsQuery.data) return undefined;
    const displayNames = new Map(
      (projectsQuery.data?.items ?? []).map((project) => [
        project.name,
        project.displayName || project.name,
      ])
    );
    return getActiveBindingsForAccount(bindingsQuery.data.items ?? [], accountName).map(
      (binding) => {
        const projectName = binding.spec?.projectRef?.name ?? '';
        return {
          binding,
          projectName,
          displayName: displayNames.get(projectName) ?? projectName,
        };
      }
    );
  }, [bindingsQuery.data, projectsQuery.data?.items, accountName]);

  return { projects, isLoading: bindingsQuery.isLoading, isError: bindingsQuery.isError };
}
