import { createGqlClient } from './client';
import { mapApiError } from '@/utils/errors/error-mapper';

export interface GqlQuotaBucket {
  name: string;
  namespace: string;
  resourceType: string;
  consumerKind: string;
  consumerName: string;
  consumerApiGroup: string;
  allocated: number;
  limit: number;
  available: number;
  displayName: string;
  description: string | null;
  registrationType: string | null;
  serviceOwner: string | null;
  serviceDisplayName: string;
}

export interface GqlQuotaBucketList {
  items: GqlQuotaBucket[];
}

export interface GqlQuotaGrantAllowance {
  resourceType: string;
  displayName: string;
  serviceDisplayName: string;
  amount: number;
}

export interface GqlQuotaCondition {
  type: string;
  status: string;
  message: string | null;
}

export interface GqlQuotaGrant {
  name: string;
  namespace: string;
  createdAt: string | null;
  autoCreated: boolean;
  allowances: GqlQuotaGrantAllowance[];
  conditions: GqlQuotaCondition[];
}

export interface GqlQuotaGrantList {
  items: GqlQuotaGrant[];
}

const QUOTA_BUCKET_FIELDS = `
  name namespace resourceType
  consumerKind consumerName consumerApiGroup
  allocated limit available
  displayName description registrationType serviceOwner serviceDisplayName
`;

const QUOTA_GRANT_FIELDS = `
  name namespace createdAt autoCreated
  allowances { resourceType displayName serviceDisplayName amount }
  conditions { type status message }
`;

const ORG_QUOTA_BUCKETS_QUERY = `
  query OrgQuotaBuckets($orgName: String!) {
    orgQuotaBuckets(orgName: $orgName) {
      items { ${QUOTA_BUCKET_FIELDS} }
    }
  }
`;

const PROJECT_QUOTA_BUCKETS_QUERY = `
  query ProjectQuotaBuckets($projectName: String!) {
    projectQuotaBuckets(projectName: $projectName) {
      items { ${QUOTA_BUCKET_FIELDS} }
    }
  }
`;

const ORG_QUOTA_GRANTS_QUERY = `
  query OrgQuotaGrants($orgName: String!) {
    orgQuotaGrants(orgName: $orgName) {
      items { ${QUOTA_GRANT_FIELDS} }
    }
  }
`;

const PROJECT_QUOTA_GRANTS_QUERY = `
  query ProjectQuotaGrants($projectName: String!) {
    projectQuotaGrants(projectName: $projectName) {
      items { ${QUOTA_GRANT_FIELDS} }
    }
  }
`;

export async function listOrgQuotaBuckets(orgName: string): Promise<GqlQuotaBucketList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(ORG_QUOTA_BUCKETS_QUERY, { orgName }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.orgQuotaBuckets ?? { items: [] };
}

export async function listProjectQuotaBuckets(projectName: string): Promise<GqlQuotaBucketList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(PROJECT_QUOTA_BUCKETS_QUERY, { projectName }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.projectQuotaBuckets ?? { items: [] };
}

export async function listOrgQuotaGrants(orgName: string): Promise<GqlQuotaGrantList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(ORG_QUOTA_GRANTS_QUERY, { orgName }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.orgQuotaGrants ?? { items: [] };
}

export async function listProjectQuotaGrants(projectName: string): Promise<GqlQuotaGrantList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(PROJECT_QUOTA_GRANTS_QUERY, { projectName }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.projectQuotaGrants ?? { items: [] };
}
