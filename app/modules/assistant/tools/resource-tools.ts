import { datumGet } from './api-helpers';
import { tool } from 'ai';
import { z } from 'zod';

interface ResourceToolDeps {
  accessToken: string;
}

function controlPlanePath(projectName: string, apiPath: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/${apiPath}`;
}

function stripInternals(item: any) {
  const { uid, resourceVersion, namespace, ...rest } = item?.metadata ?? {};
  return { ...item, metadata: rest };
}

export function createResourceTools({ accessToken }: ResourceToolDeps) {
  return {
    listProjectDomains: tool({
      description:
        'List all domains in a project.' +
        " Call this when the operator needs to see a customer's domain configuration.",
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const path = controlPlanePath(
          projectName,
          'apis/networking.datumapis.com/v1alpha/namespaces/default/domains'
        );
        const result = await datumGet(path, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          domains: Array.isArray(items)
            ? items.map((d: any) => ({
                name: d.metadata?.name,
                spec: d.spec,
                status: d.status,
                url: `/customers/projects/${projectName}/domains/${d.metadata?.namespace ?? 'default'}/${d.metadata?.name}`,
              }))
            : [],
        };
      },
    }),

    listProjectDnsZones: tool({
      description:
        'List all DNS zones in a project.' +
        ' Call this when the operator asks about DNS configuration.',
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const path = controlPlanePath(
          projectName,
          'apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones'
        );
        const result = await datumGet(path, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          dnsZones: Array.isArray(items) ? items.map(stripInternals) : [],
        };
      },
    }),

    listProjectEdge: tool({
      description:
        'List all AI Edge / HTTP proxy resources in a project.' +
        ' Call this when the operator asks about edge gateways or HTTP proxies.',
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const path = controlPlanePath(
          projectName,
          'apis/networking.datumapis.com/v1alpha/namespaces/default/httpproxies'
        );
        const result = await datumGet(path, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          httpProxies: Array.isArray(items) ? items.map(stripInternals) : [],
        };
      },
    }),

    listProjectExportPolicies: tool({
      description:
        'List all telemetry export policies in a project.' +
        " Call this when the operator asks about a customer's observability setup.",
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const path = controlPlanePath(
          projectName,
          'apis/telemetry.miloapis.com/v1alpha1/namespaces/default/exportpolicies'
        );
        const result = await datumGet(path, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          exportPolicies: Array.isArray(items) ? items.map(stripInternals) : [],
        };
      },
    }),

    listProjectQuotas: tool({
      description:
        'List resource quotas and usage for a project.' +
        ' Call this when the operator asks about limits or resource allocation.',
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const path = controlPlanePath(
          projectName,
          'apis/quota.miloapis.com/v1alpha1/namespaces/default/allowancebuckets'
        );
        const result = await datumGet(path, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          quotas: Array.isArray(items) ? items.map(stripInternals) : [],
        };
      },
    }),
  };
}
