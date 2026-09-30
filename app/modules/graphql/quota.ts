import { createGqlClient } from './client';
import { generateQueryOp } from './generated';
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

const QUOTA_BUCKET_SELECTION = {
  name: true,
  namespace: true,
  resourceType: true,
  consumerKind: true,
  consumerName: true,
  consumerApiGroup: true,
  allocated: true,
  limit: true,
  available: true,
  displayName: true,
  description: true,
  registrationType: true,
  serviceOwner: true,
  serviceDisplayName: true,
} as const;

const QUOTA_GRANT_SELECTION = {
  name: true,
  namespace: true,
  createdAt: true,
  autoCreated: true,
  allowances: { resourceType: true, displayName: true, serviceDisplayName: true, amount: true },
  conditions: { type: true, status: true, message: true },
} as const;

export async function listOrgQuotaBuckets(orgName: string): Promise<GqlQuotaBucketList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffOrgQuotaBuckets',
    orgQuotaBuckets: [{ orgName }, { items: QUOTA_BUCKET_SELECTION }],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.orgQuotaBuckets ?? { items: [] }) as GqlQuotaBucketList;
}

export async function listProjectQuotaBuckets(projectName: string): Promise<GqlQuotaBucketList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffProjectQuotaBuckets',
    projectQuotaBuckets: [{ projectName }, { items: QUOTA_BUCKET_SELECTION }],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.projectQuotaBuckets ?? { items: [] }) as GqlQuotaBucketList;
}

export async function listOrgQuotaGrants(orgName: string): Promise<GqlQuotaGrantList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffOrgQuotaGrants',
    orgQuotaGrants: [{ orgName }, { items: QUOTA_GRANT_SELECTION }],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.orgQuotaGrants ?? { items: [] }) as GqlQuotaGrantList;
}

export async function listProjectQuotaGrants(projectName: string): Promise<GqlQuotaGrantList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffProjectQuotaGrants',
    projectQuotaGrants: [{ projectName }, { items: QUOTA_GRANT_SELECTION }],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.projectQuotaGrants ?? { items: [] }) as GqlQuotaGrantList;
}
