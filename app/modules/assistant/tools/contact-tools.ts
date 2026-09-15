import { datumGet, datumPost } from './api-helpers';
import { contactRoutes } from '@/utils/config/routes.config';
import { tool } from 'ai';
import { z } from 'zod';

interface ContactToolDeps {
  accessToken: string;
}

const GROUP = 'notification.miloapis.com/v1alpha1';

/**
 * Contact management tools (marketing contacts + newsletter/group membership).
 *
 * These are write-capable. The system prompt instructs Patch to check for an
 * existing contact first, resolve any named group, and confirm before writing.
 */
export function createContactTools({ accessToken }: ContactToolDeps) {
  return {
    searchContacts: tool({
      description:
        'Look up marketing contacts by email to check whether one already exists.' +
        ' ALWAYS call this before createContact so you never create a duplicate.',
      inputSchema: z.object({
        email: z.string().describe('The contact email address to look up'),
      }),
      execute: async ({ email }: { email: string }) => {
        const result = await datumGet(
          `/apis/${GROUP}/contacts?fieldSelector=${encodeURIComponent(`spec.email=${email}`)}&limit=20`,
          accessToken
        );
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          results: Array.isArray(items)
            ? items.map((c: any) => ({
                name: c.metadata?.name,
                namespace: c.metadata?.namespace,
                email: c.spec?.email,
                givenName: c.spec?.givenName,
                familyName: c.spec?.familyName,
                url: contactRoutes.detail(c.metadata?.namespace, c.metadata?.name),
              }))
            : [],
          email,
        };
      },
    }),

    listContactGroups: tool({
      description:
        'List marketing contact groups (e.g. mailing / newsletter lists).' +
        ' Call this to resolve a group the operator names before addContactToGroup.',
      inputSchema: z.object({
        query: z.string().optional().describe('Optional exact group resource name to filter by'),
      }),
      execute: async ({ query }: { query?: string }) => {
        const qs = query
          ? `?fieldSelector=${encodeURIComponent(`metadata.name=${query}`)}&limit=50`
          : '?limit=50';
        const result = await datumGet(`/apis/${GROUP}/contactgroups${qs}`, accessToken);
        if (result.error) return result;
        const items = result?.items ?? [];
        return {
          results: Array.isArray(items)
            ? items.map((g: any) => ({
                name: g.metadata?.name,
                namespace: g.metadata?.namespace,
                displayName: g.spec?.name ?? g.metadata?.name,
                description: g.spec?.description,
              }))
            : [],
        };
      },
    }),

    createContact: tool({
      description:
        'Create a new marketing contact. Confirm with the operator first (unless the request is' +
        ' explicit) and call searchContacts beforehand to avoid duplicates.',
      inputSchema: z.object({
        email: z.string().describe('Contact email address (required)'),
        givenName: z.string().optional().describe('First name'),
        familyName: z.string().optional().describe('Last name'),
        namespace: z
          .string()
          .optional()
          .describe("Namespace to create the contact in (defaults to 'default')"),
      }),
      execute: async ({
        email,
        givenName,
        familyName,
        namespace = 'default',
      }: {
        email: string;
        givenName?: string;
        familyName?: string;
        namespace?: string;
      }) => {
        const result = await datumPost(
          `/apis/${GROUP}/namespaces/${encodeURIComponent(namespace)}/contacts`,
          {
            apiVersion: GROUP,
            kind: 'Contact',
            metadata: { generateName: 'contact-', namespace },
            spec: {
              email,
              ...(givenName ? { givenName } : {}),
              ...(familyName ? { familyName } : {}),
            },
          },
          accessToken
        );
        if (result.error) return result;
        const name = result?.metadata?.name;
        const ns = result?.metadata?.namespace ?? namespace;
        return {
          created: true,
          name,
          namespace: ns,
          email,
          url: contactRoutes.detail(ns, name),
        };
      },
    }),

    addContactToGroup: tool({
      description:
        'Add an existing contact to a contact group (e.g. a newsletter list) by creating a' +
        ' group membership. Resolve the group with listContactGroups first.',
      inputSchema: z.object({
        contactName: z
          .string()
          .describe('The contact resource name (from searchContacts/createContact)'),
        groupName: z.string().describe('The contact group resource name (from listContactGroups)'),
        namespace: z
          .string()
          .optional()
          .describe("Namespace of the contact and group (defaults to 'default')"),
      }),
      execute: async ({
        contactName,
        groupName,
        namespace = 'default',
      }: {
        contactName: string;
        groupName: string;
        namespace?: string;
      }) => {
        const result = await datumPost(
          `/apis/${GROUP}/namespaces/${encodeURIComponent(namespace)}/contactgroupmemberships`,
          {
            apiVersion: GROUP,
            kind: 'ContactGroupMembership',
            metadata: { generateName: 'contact-group-membership-', namespace },
            spec: {
              contactRef: { name: contactName, namespace },
              contactGroupRef: { name: groupName, namespace },
            },
          },
          accessToken
        );
        if (result.error) return result;
        return {
          added: true,
          contact: contactName,
          group: groupName,
          namespace,
        };
      },
    }),
  };
}
