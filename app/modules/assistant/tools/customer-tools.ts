import { datumGet } from './api-helpers';
import { tool } from 'ai';
import { z } from 'zod';

interface CustomerToolDeps {
  accessToken: string;
}

export function createCustomerTools({ accessToken }: CustomerToolDeps) {
  return {
    searchUsers: tool({
      description:
        'Search for platform users by email, name, or ID.' +
        ' Call this when the operator asks about a specific user or wants to find users.',
      inputSchema: z.object({
        query: z.string().describe('Search query (email, name, or user ID)'),
      }),
      execute: async ({ query }: { query: string }) => {
        const fieldSelector = query.includes('@')
          ? `spec.email=${query}`
          : `metadata.name=${query}`;
        const result = await datumGet(
          `/apis/iam.miloapis.com/v1alpha1/users?fieldSelector=${encodeURIComponent(fieldSelector)}&limit=20`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          results: Array.isArray(items)
            ? items.slice(0, 20).map((u: any) => ({
                name: u.metadata?.name,
                email: u.spec?.email,
                givenName: u.spec?.givenName,
                familyName: u.spec?.familyName,
                registrationApproval: u.status?.registrationApproval,
                url: `/customers/users/${encodeURIComponent(u.metadata?.name)}`,
              }))
            : [],
          query,
        };
      },
    }),

    searchOrganizations: tool({
      description:
        'Search for organizations by name or ID.' +
        ' Call this when the operator asks about a specific organization.',
      inputSchema: z.object({
        query: z.string().describe('Search query (org name or ID)'),
      }),
      execute: async ({ query }: { query: string }) => {
        const result = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/organizations?fieldSelector=${encodeURIComponent(`metadata.name=${query}`)}&limit=20`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          results: Array.isArray(items)
            ? items.slice(0, 20).map((o: any) => ({
                name: o.metadata?.name,
                displayName: o.metadata?.annotations?.['kubernetes.io/display-name'],
                url: `/customers/organizations/${encodeURIComponent(o.metadata?.name)}`,
              }))
            : [],
          query,
        };
      },
    }),

    searchProjects: tool({
      description:
        'Search for projects by name or ID.' +
        ' Call this when the operator asks about a specific project.',
      inputSchema: z.object({
        query: z.string().describe('Search query (project name or ID)'),
      }),
      execute: async ({ query }: { query: string }) => {
        const result = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/projects?fieldSelector=${encodeURIComponent(`metadata.name=${query}`)}&limit=20`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          results: Array.isArray(items)
            ? items.slice(0, 20).map((p: any) => ({
                name: p.metadata?.name,
                displayName: p.metadata?.annotations?.['kubernetes.io/display-name'],
                url: `/customers/projects/${encodeURIComponent(p.metadata?.name)}`,
              }))
            : [],
          query,
        };
      },
    }),

    listUsers: tool({
      description:
        'List platform users with optional filters.' +
        ' Use this to browse users or filter by approval status.' +
        ' WARNING: This returns users in arbitrary order — it does NOT sort by creation date.' +
        ' For "newest" / "most recent" / "latest" users, use `queryActivityLogs` instead with verb="create" and resourceType="users".',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20).describe('Max results to return'),
        registrationApproval: z
          .string()
          .optional()
          .describe('Filter by approval status (e.g. "approved", "pending")'),
      }),
      execute: async ({
        limit,
        registrationApproval,
      }: {
        limit: number;
        registrationApproval?: string;
      }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (registrationApproval) {
          params.set('fieldSelector', `status.registrationApproval=${registrationApproval}`);
        }
        const result = await datumGet(
          `/apis/iam.miloapis.com/v1alpha1/users?${params}`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          users: Array.isArray(items)
            ? items.map((u: any) => ({
                name: u.metadata?.name,
                email: u.spec?.email,
                givenName: u.spec?.givenName,
                familyName: u.spec?.familyName,
                createdAt: u.metadata?.creationTimestamp,
                registrationApproval: u.status?.registrationApproval,
                url: `/customers/users/${encodeURIComponent(u.metadata?.name)}`,
              }))
            : [],
        };
      },
    }),

    getUser: tool({
      description:
        'Get detailed information about a single user including profile, approval status, and deactivation state.' +
        ' Use the user resource name (not email) as the userId.',
      inputSchema: z.object({
        userId: z.string().describe('The user resource name (e.g. "users/abc123")'),
      }),
      execute: async ({ userId }: { userId: string }) => {
        const name = userId.startsWith('users/') ? userId.slice('users/'.length) : userId;
        const user = await datumGet(`/apis/iam.miloapis.com/v1alpha1/users/${name}`, accessToken);
        if (user.error) return user;
        return {
          ...user,
          url: `/customers/users/${encodeURIComponent(user.metadata?.name ?? name)}`,
        };
      },
    }),

    getOrganization: tool({
      description:
        'Get detailed information about a single organization.' +
        ' Use the organization resource name.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
      }),
      execute: async ({ orgName }: { orgName: string }) => {
        const name = orgName.startsWith('organizations/')
          ? orgName.slice('organizations/'.length)
          : orgName;
        const org = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${name}`,
          accessToken
        );
        if (org.error) return org;
        return {
          ...org,
          url: `/customers/organizations/${encodeURIComponent(org.metadata?.name ?? name)}`,
        };
      },
    }),

    getProject: tool({
      description:
        'Get detailed information about a single project.' + ' Use the project resource name.',
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const name = projectName.startsWith('projects/')
          ? projectName.slice('projects/'.length)
          : projectName;
        const project = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${name}`,
          accessToken
        );
        if (project.error) return project;
        return {
          ...project,
          url: `/customers/projects/${encodeURIComponent(project.metadata?.name ?? name)}`,
        };
      },
    }),

    listOrgProjects: tool({
      description: 'List all projects belonging to an organization.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
      }),
      execute: async ({ orgName }: { orgName: string }) => {
        const name = orgName.startsWith('organizations/')
          ? orgName.slice('organizations/'.length)
          : orgName;
        const result = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${name}/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          projects: Array.isArray(items)
            ? items.map((p: any) => ({
                name: p.metadata?.name,
                displayName: p.spec?.displayName,
                url: `/customers/projects/${encodeURIComponent(p.metadata?.name)}`,
              }))
            : [],
        };
      },
    }),

    listOrgMembers: tool({
      description: 'List members and pending invitations for an organization.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
      }),
      execute: async ({ orgName }: { orgName: string }) => {
        const name = orgName.startsWith('organizations/')
          ? orgName.slice('organizations/'.length)
          : orgName;
        const result = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${name}/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/organizationmemberships`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          members: Array.isArray(items)
            ? items.map((m: any) => ({
                name: m.metadata?.name,
                member: m.spec?.member,
                roles: m.spec?.roles,
              }))
            : [],
        };
      },
    }),

    listUserOrganizations: tool({
      description:
        'List all organizations a user belongs to.' +
        ' Use this after finding a user to see their org memberships.',
      inputSchema: z.object({
        userId: z.string().describe('The user resource name (e.g. "327254604829956109")'),
      }),
      execute: async ({ userId }: { userId: string }) => {
        const name = userId.startsWith('users/') ? userId.slice('users/'.length) : userId;
        const result = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/organizationmemberships?fieldSelector=${encodeURIComponent(`spec.userRef.name=${name}`)}`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          memberships: Array.isArray(items)
            ? items.map((m: any) => {
                const orgName = m.spec?.organizationRef?.name ?? '';
                return {
                  orgName,
                  displayName: m.status?.organization?.displayName,
                  orgType: m.status?.organization?.type,
                  roles: m.spec?.roles,
                  url: `/customers/organizations/${encodeURIComponent(orgName)}`,
                };
              })
            : [],
        };
      },
    }),
  };
}
