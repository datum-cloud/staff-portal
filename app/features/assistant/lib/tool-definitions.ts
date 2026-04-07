import { executeAssistantTool } from './tool-executor';
import { jsonSchema, tool } from 'ai';

/**
 * Factory function that creates the AI SDK tools object for the operator
 * assistant. Each tool's execute function calls executeAssistantTool with the
 * operator's forwarded auth token.
 *
 * Tools are intentionally read-only — no create, update, patch, or delete
 * operations are exposed. Even if Claude hallucinates a tool name, no mutation
 * tools exist to call.
 */
export function createTools(token: string) {
  return {
    search_resources: tool({
      description:
        'Full-text search across all indexed platform resources. Prefer this tool when the operator asks about a resource by name, email, or keyword. Returns up to 20 results sorted by relevance.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Free-text search query. Can be a name, email address, keyword, or phrase.',
          },
          resource_types: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional filter to specific resource kinds, e.g. ["User", "Organization"]. Omit to search all types.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['query'],
      }),
      execute: async (input) => executeAssistantTool('search_resources', input, token),
    }),

    list_users: tool({
      description:
        'List platform users with optional filters. Use this to browse users or filter by registration approval status.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          registration_approval: {
            type: 'string',
            enum: ['Pending', 'Approved', 'Rejected'],
            description: 'Filter by registration approval status.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of users to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_users', input, token),
    }),

    get_user: tool({
      description:
        'Get a specific user by their resource name (the Kubernetes metadata.name, not their email). Use search_resources first if you only know the email.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The user's resource name (metadata.name), e.g. 'user-abc123'.",
          },
        },
        required: ['name'],
      }),
      execute: async (input) => executeAssistantTool('get_user', input, token),
    }),

    list_organizations: tool({
      description:
        'List all organizations on the platform. Returns name, display name, and creation time.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum number of organizations to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_organizations', input, token),
    }),

    get_organization: tool({
      description: 'Get a specific organization by its resource name.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The organization's resource name (metadata.name).",
          },
        },
        required: ['name'],
      }),
      execute: async (input) => executeAssistantTool('get_organization', input, token),
    }),

    list_projects: tool({
      description: 'List projects on the platform.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum number of projects to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_projects', input, token),
    }),

    get_project: tool({
      description: 'Get a specific project by its resource name.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The project's resource name (metadata.name).",
          },
        },
        required: ['name'],
      }),
      execute: async (input) => executeAssistantTool('get_project', input, token),
    }),

    list_fraud_evaluations: tool({
      description:
        'List fraud evaluations with optional filters. Returns score, decision, and user reference.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          user_name: {
            type: 'string',
            description: 'Filter by user resource name (spec.userRef.name).',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of evaluations to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_fraud_evaluations', input, token),
    }),

    get_fraud_evaluation: tool({
      description: 'Get a specific fraud evaluation by its resource name.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The fraud evaluation's resource name (metadata.name).",
          },
        },
        required: ['name'],
      }),
      execute: async (input) => executeAssistantTool('get_fraud_evaluation', input, token),
    }),

    list_contacts: tool({
      description: 'List notification contacts across all namespaces.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Filter contacts by email address.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of contacts to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_contacts', input, token),
    }),

    list_contact_groups: tool({
      description: 'List contact groups across all namespaces.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum number of contact groups to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_contact_groups', input, token),
    }),

    list_emails: tool({
      description:
        'List sent emails across all namespaces. Useful for checking email delivery for a specific user.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: "Namespace to query. Defaults to 'milo-system'.",
            default: 'milo-system',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of emails to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_emails', input, token),
    }),

    list_email_broadcasts: tool({
      description: 'List email broadcasts across all namespaces.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum number of broadcasts to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('list_email_broadcasts', input, token),
    }),

    query_audit_logs: tool({
      description:
        'Query the platform audit log. Returns recent API activity. Useful for investigating who did what and when.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description:
              "CEL filter expression. Examples: \"user.username == 'alice'\", \"objectRef.resource == 'users'\", \"verb == 'delete'\". The filter objectRef.apiGroup != 'activity.miloapis.com' is always applied automatically.",
          },
          start_time: {
            type: 'string',
            description: 'ISO 8601 start time. Defaults to 7 days ago.',
            format: 'date-time',
          },
          end_time: {
            type: 'string',
            description: 'ISO 8601 end time. Defaults to now.',
            format: 'date-time',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of log entries to return. Default 20, max 100.',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      }),
      execute: async (input) => executeAssistantTool('query_audit_logs', input, token),
    }),

    get_resource_count: tool({
      description:
        'Get the total count of a specific resource type. Use this to answer "how many X are there?" questions. Efficient — fetches only 1 item to read the total from list metadata.',
      parameters: jsonSchema<Record<string, unknown>>({
        type: 'object',
        properties: {
          resource_type: {
            type: 'string',
            enum: [
              'users',
              'organizations',
              'projects',
              'fraud_evaluations',
              'contacts',
              'contact_groups',
            ],
            description: 'The resource type to count.',
          },
        },
        required: ['resource_type'],
      }),
      execute: async (input) => executeAssistantTool('get_resource_count', input, token),
    }),
  };
}

// Re-export from the client-safe module so server-only callers can use one import.
export { getToolLabel } from './tool-labels';
