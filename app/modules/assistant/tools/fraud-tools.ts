import { datumGet } from './api-helpers';
import { tool } from 'ai';
import { z } from 'zod';

interface FraudToolDeps {
  accessToken: string;
}

async function fetchContactEmailMap(accessToken: string): Promise<Map<string, string>> {
  const contacts = await datumGet('/apis/notification.miloapis.com/v1alpha1/contacts', accessToken);
  const map = new Map<string, string>();
  if (contacts.error || !Array.isArray(contacts?.items)) return map;
  for (const c of contacts.items) {
    const userId = c.spec?.subject?.name;
    const email = c.spec?.email;
    if (userId && email) map.set(userId, email);
  }
  return map;
}

export function createFraudTools({ accessToken }: FraudToolDeps) {
  return {
    listFraudEvaluations: tool({
      description:
        'List recent fraud evaluations with their verdicts.' +
        ' Call this when the operator asks about fraud checks or suspicious activity.',
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe('Max number of evaluations to return'),
      }),
      execute: async ({ limit }: { limit: number }) => {
        const [result, emailMap] = await Promise.all([
          datumGet(
            `/apis/fraud.miloapis.com/v1alpha1/fraudevaluations?limit=${limit}`,
            accessToken
          ),
          fetchContactEmailMap(accessToken),
        ]);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          evaluations: Array.isArray(items)
            ? items.slice(0, limit).map((e: any) => {
                const userId = e.spec?.userRef?.name;
                return {
                  name: e.metadata?.name,
                  userId,
                  email: userId ? emailMap.get(userId) : undefined,
                  decision: e.status?.decision,
                  compositeScore: e.status?.compositeScore,
                  phase: e.status?.phase,
                  enforcementAction: e.status?.enforcementAction,
                  lastEvaluationTime: e.status?.lastEvaluationTime,
                  url: `/fraud/${encodeURIComponent(e.metadata?.name)}`,
                };
              })
            : [],
        };
      },
    }),

    getFraudEvaluation: tool({
      description: 'Get details of a specific fraud evaluation including full verdict and signals.',
      inputSchema: z.object({
        name: z.string().describe('The fraud evaluation resource name'),
      }),
      execute: async ({ name }: { name: string }) => {
        const [result, emailMap] = await Promise.all([
          datumGet(
            `/apis/fraud.miloapis.com/v1alpha1/fraudevaluations/${encodeURIComponent(name)}`,
            accessToken
          ),
          fetchContactEmailMap(accessToken),
        ]);
        if (result.error) return result;
        const userId = result.spec?.userRef?.name;
        return {
          ...result,
          userId,
          email: userId ? emailMap.get(userId) : undefined,
          url: `/fraud/${encodeURIComponent(name)}`,
        };
      },
    }),

    listFraudPolicies: tool({
      description:
        'List all active fraud detection policies.' +
        ' Call this when the operator asks about fraud rules or detection configuration.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await datumGet(
          '/apis/fraud.miloapis.com/v1alpha1/fraudpolicies',
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          policies: Array.isArray(items)
            ? items.map((p: any) => ({
                name: p.metadata?.name,
                spec: p.spec,
                url: '/fraud/policy',
              }))
            : [],
        };
      },
    }),
  };
}
