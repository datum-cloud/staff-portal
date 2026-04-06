/**
 * Server-side tool executor for the operator assistant.
 *
 * Each tool maps to existing OpenAPI-generated functions, called with the
 * operator's forwarded auth token. Results are trimmed of Kubernetes noise
 * and enriched with portalUrl before being returned to Claude.
 *
 * All operations are read-only. No mutations are exposed.
 */
import { injectPortalUrl, type PortalResourceType } from './portal-links';
import { trimK8sNoise } from './response-trimmer';
import { env } from '@/utils/config/env.server';
import { createActivityMiloapisComV1Alpha1AuditLogQuery } from '@openapi/activity.miloapis.com/v1alpha1';
import {
  listFraudMiloapisComV1Alpha1FraudEvaluation,
  readFraudMiloapisComV1Alpha1FraudEvaluation,
} from '@openapi/fraud.miloapis.com/v1alpha1';
import {
  listIamMiloapisComV1Alpha1User,
  readIamMiloapisComV1Alpha1User,
} from '@openapi/iam.miloapis.com/v1alpha1';
import {
  listNotificationMiloapisComV1Alpha1ContactForAllNamespaces,
  listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces,
  listNotificationMiloapisComV1Alpha1EmailBroadcastForAllNamespaces,
  listNotificationMiloapisComV1Alpha1NamespacedEmail,
} from '@openapi/notification.miloapis.com/v1alpha1';
import {
  listResourcemanagerMiloapisComV1Alpha1Organization,
  listResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1Organization,
  readResourcemanagerMiloapisComV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createSearchMiloapisComV1Alpha1ResourceSearchQuery } from '@openapi/search.miloapis.com/v1alpha1';

// The server-side base URL for direct API calls (not via browser proxy)
const API_BASE_URL = env.API_URL;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Trims and enriches a single resource object.
 */
function processResource(
  resource: unknown,
  resourceType: PortalResourceType
): Record<string, unknown> {
  const trimmed = trimK8sNoise(resource) as Record<string, unknown>;
  return injectPortalUrl(trimmed, resourceType);
}

/**
 * Trims and enriches an array of resource objects.
 */
function processResources(
  items: unknown[],
  resourceType: PortalResourceType
): Record<string, unknown>[] {
  return items.map((item) => processResource(item, resourceType));
}

// ---- Tool handler types ----

type ToolInput = Record<string, unknown>;

/**
 * Validates that a required string field is present in the tool input.
 * Returns the string value on success or throws with a descriptive error.
 */
function requireString(input: ToolInput, field: string): string {
  const value = input[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Tool input field '${field}' must be a non-empty string`);
  }
  return value;
}

// ---- Individual tool handlers ----

async function handleSearchResources(input: ToolInput, token: string) {
  const query = requireString(input, 'query');
  const resourceTypes = (input.resource_types as string[] | undefined) ?? [];
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);

  const targetResources = resourceTypes
    .map((kind: string) => {
      // Map kind names to API group/version/kind triples
      const kindToGroup: Record<string, { group: string; version: string }> = {
        User: { group: 'iam.miloapis.com', version: 'v1alpha1' },
        Organization: { group: 'resourcemanager.miloapis.com', version: 'v1alpha1' },
        Project: { group: 'resourcemanager.miloapis.com', version: 'v1alpha1' },
        FraudEvaluation: { group: 'fraud.miloapis.com', version: 'v1alpha1' },
        Contact: { group: 'notification.miloapis.com', version: 'v1alpha1' },
        ContactGroup: { group: 'notification.miloapis.com', version: 'v1alpha1' },
        Email: { group: 'notification.miloapis.com', version: 'v1alpha1' },
      };
      const info = kindToGroup[kind];
      return info ? { group: info.group, version: info.version, kind } : null;
    })
    .filter(Boolean);

  const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery({
    baseURL: API_BASE_URL,
    body: {
      apiVersion: 'search.miloapis.com/v1alpha1',
      kind: 'ResourceSearchQuery',
      metadata: {
        name: `query-assistant-${Date.now()}`,
      },
      spec: {
        query,
        limit,
        ...(targetResources.length > 0 && { targetResources: targetResources as any }),
      },
    },
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
  });

  const results = response.data?.status?.results ?? [];

  const trimmedResults = results
    .slice()
    .sort((a, b) => ((b as any).relevanceScore ?? 0) - ((a as any).relevanceScore ?? 0))
    .map((result: any) => {
      const resource = trimK8sNoise(result.resource) as Record<string, unknown>;
      // Determine resource type from apiVersion/kind if available
      const kind = (result.resource as any)?.kind as string | undefined;
      const portalResourceType = kind as PortalResourceType | undefined;
      const enriched = portalResourceType
        ? injectPortalUrl(resource, portalResourceType)
        : resource;
      return {
        relevanceScore: result.relevanceScore,
        resource: enriched,
      };
    });

  return { results: trimmedResults, total: trimmedResults.length };
}

async function handleListUsers(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);
  const registrationApproval = input.registration_approval as string | undefined;

  const fieldSelectorParts: string[] = [];
  if (registrationApproval) {
    fieldSelectorParts.push(`status.registrationApproval=${registrationApproval}`);
  }

  const response = await listIamMiloapisComV1Alpha1User({
    baseURL: API_BASE_URL,
    query: {
      limit,
      ...(fieldSelectorParts.length > 0 && { fieldSelector: fieldSelectorParts.join(',') }),
    },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'User');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleGetUser(input: ToolInput, token: string) {
  const name = requireString(input, 'name');

  const response = await readIamMiloapisComV1Alpha1User({
    baseURL: API_BASE_URL,
    path: { name },
    headers: authHeaders(token),
  });

  const resource = response.data;
  if (!resource) return { error: 'User not found' };
  return processResource(resource, 'User');
}

async function handleListOrganizations(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);

  const response = await listResourcemanagerMiloapisComV1Alpha1Organization({
    baseURL: API_BASE_URL,
    query: { limit },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'Organization');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleGetOrganization(input: ToolInput, token: string) {
  const name = requireString(input, 'name');

  const response = await readResourcemanagerMiloapisComV1Alpha1Organization({
    baseURL: API_BASE_URL,
    path: { name },
    headers: authHeaders(token),
  });

  const resource = response.data;
  if (!resource) return { error: 'Organization not found' };
  return processResource(resource, 'Organization');
}

async function handleListProjects(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);

  const response = await listResourcemanagerMiloapisComV1Alpha1Project({
    baseURL: API_BASE_URL,
    query: { limit },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'Project');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleGetProject(input: ToolInput, token: string) {
  const name = requireString(input, 'name');

  const response = await readResourcemanagerMiloapisComV1Alpha1Project({
    baseURL: API_BASE_URL,
    path: { name },
    headers: authHeaders(token),
  });

  const resource = response.data;
  if (!resource) return { error: 'Project not found' };
  return processResource(resource, 'Project');
}

async function handleListFraudEvaluations(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);
  const userName = input.user_name as string | undefined;

  const response = await listFraudMiloapisComV1Alpha1FraudEvaluation({
    baseURL: API_BASE_URL,
    query: {
      limit,
      ...(userName && { fieldSelector: `spec.userRef.name=${userName}` }),
    },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'FraudEvaluation');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleGetFraudEvaluation(input: ToolInput, token: string) {
  const name = requireString(input, 'name');

  const response = await readFraudMiloapisComV1Alpha1FraudEvaluation({
    baseURL: API_BASE_URL,
    path: { name },
    headers: authHeaders(token),
  });

  const resource = response.data;
  if (!resource) return { error: 'Fraud evaluation not found' };
  return processResource(resource, 'FraudEvaluation');
}

async function handleListContacts(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);
  const email = input.email as string | undefined;

  const response = await listNotificationMiloapisComV1Alpha1ContactForAllNamespaces({
    baseURL: API_BASE_URL,
    query: {
      limit,
      ...(email && { fieldSelector: `spec.email=${email}` }),
    },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'Contact');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleListContactGroups(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);

  const response = await listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces({
    baseURL: API_BASE_URL,
    query: { limit },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = processResources(data?.items ?? [], 'ContactGroup');
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleListEmails(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);
  const namespace = (input.namespace as string | undefined) ?? 'milo-system';

  const response = await listNotificationMiloapisComV1Alpha1NamespacedEmail({
    baseURL: API_BASE_URL,
    path: { namespace },
    query: { limit },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = (data?.items ?? []).map((item) => trimK8sNoise(item) as Record<string, unknown>);
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleListEmailBroadcasts(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);

  const response = await listNotificationMiloapisComV1Alpha1EmailBroadcastForAllNamespaces({
    baseURL: API_BASE_URL,
    query: { limit },
    headers: authHeaders(token),
  });

  const data = response.data;
  const items = (data?.items ?? []).map((item) => trimK8sNoise(item) as Record<string, unknown>);
  return {
    items,
    remainingItemCount: data?.metadata?.remainingItemCount ?? 0,
    total: items.length,
  };
}

async function handleQueryAuditLogs(input: ToolInput, token: string) {
  const limit = Math.min((input.limit as number | undefined) ?? 20, 100);
  const userFilter = input.filter as string | undefined;
  const now = new Date();
  const startTime =
    (input.start_time as string | undefined) ??
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Cap endTime at now — the API rejects future timestamps
  const requestedEnd = (input.end_time as string | undefined) ?? now.toISOString();
  const endTime = new Date(requestedEnd) > now ? now.toISOString() : requestedEnd;

  // Always exclude activity API entries from results
  const baseFilter = "objectRef.apiGroup != 'activity.miloapis.com'";
  const filter = userFilter ? `${baseFilter} && ${userFilter}` : baseFilter;

  const response = await createActivityMiloapisComV1Alpha1AuditLogQuery({
    baseURL: API_BASE_URL,
    body: {
      apiVersion: 'activity.miloapis.com/v1alpha1',
      kind: 'AuditLogQuery',
      metadata: {
        name: `query-assistant-${Date.now()}`,
      },
      spec: {
        startTime,
        endTime,
        limit,
        filter,
      },
    },
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
  });

  const status = response.data?.status;
  return {
    results: status?.results ?? [],
    effectiveStartTime: status?.effectiveStartTime,
    effectiveEndTime: status?.effectiveEndTime,
    continue: (status as any)?.continue,
    total: (status?.results ?? []).length,
  };
}

async function handleGetResourceCount(input: ToolInput, token: string) {
  const resourceType = requireString(input, 'resource_type');

  let items: unknown[] | undefined;
  let remainingItemCount: number | undefined;

  switch (resourceType) {
    case 'users': {
      const res = await listIamMiloapisComV1Alpha1User({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    case 'organizations': {
      const res = await listResourcemanagerMiloapisComV1Alpha1Organization({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    case 'projects': {
      const res = await listResourcemanagerMiloapisComV1Alpha1Project({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    case 'fraud_evaluations': {
      const res = await listFraudMiloapisComV1Alpha1FraudEvaluation({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    case 'contacts': {
      const res = await listNotificationMiloapisComV1Alpha1ContactForAllNamespaces({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    case 'contact_groups': {
      const res = await listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces({
        baseURL: API_BASE_URL,
        query: { limit: 1 },
        headers: authHeaders(token),
      });
      items = res.data?.items;
      remainingItemCount = res.data?.metadata?.remainingItemCount;
      break;
    }
    default:
      return {
        error: `Unknown resource type: ${resourceType}`,
        count: 0,
        resource_type: resourceType,
      };
  }

  const count = !items || items.length === 0 ? 0 : 1 + (remainingItemCount ?? 0);

  return { count, resource_type: resourceType };
}

// ---- Dispatch table ----

const TOOL_HANDLERS: Record<string, (input: ToolInput, token: string) => Promise<unknown>> = {
  search_resources: handleSearchResources,
  list_users: handleListUsers,
  get_user: handleGetUser,
  list_organizations: handleListOrganizations,
  get_organization: handleGetOrganization,
  list_projects: handleListProjects,
  get_project: handleGetProject,
  list_fraud_evaluations: handleListFraudEvaluations,
  get_fraud_evaluation: handleGetFraudEvaluation,
  list_contacts: handleListContacts,
  list_contact_groups: handleListContactGroups,
  list_emails: handleListEmails,
  list_email_broadcasts: handleListEmailBroadcasts,
  query_audit_logs: handleQueryAuditLogs,
  get_resource_count: handleGetResourceCount,
};

/**
 * Executes a named tool with the given input and operator token.
 * Throws if the tool name is unknown.
 */
export async function executeAssistantTool(
  toolName: string,
  input: unknown,
  token: string
): Promise<unknown> {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return handler(input as ToolInput, token);
}
