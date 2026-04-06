import type Anthropic from '@anthropic-ai/sdk';

/**
 * All 15 read-only tool definitions for the operator assistant.
 * These are passed directly to the Anthropic messages API.
 *
 * Tools are intentionally read-only — no create, update, patch, or delete
 * operations are exposed. Even if Claude hallucinates a tool name, no mutation
 * tools exist to call.
 */
export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_resources',
    description:
      'Full-text search across all indexed platform resources. Prefer this tool when the operator asks about a resource by name, email, or keyword. Returns up to 20 results sorted by relevance.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search query. Can be a name, email address, keyword, or phrase.',
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
    },
  },

  {
    name: 'list_users',
    description:
      'List platform users with optional filters. Use this to browse users or filter by registration approval status.',
    input_schema: {
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
    },
  },

  {
    name: 'get_user',
    description:
      'Get a specific user by their resource name (the Kubernetes metadata.name, not their email). Use search_resources first if you only know the email.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The user's resource name (metadata.name), e.g. 'user-abc123'.",
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'list_organizations',
    description:
      'List all organizations on the platform. Returns name, display name, and creation time.',
    input_schema: {
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
    },
  },

  {
    name: 'get_organization',
    description: 'Get a specific organization by its resource name.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The organization's resource name (metadata.name).",
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'list_projects',
    description: 'List projects on the platform.',
    input_schema: {
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
    },
  },

  {
    name: 'get_project',
    description: 'Get a specific project by its resource name.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The project's resource name (metadata.name).",
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'list_fraud_evaluations',
    description:
      'List fraud evaluations with optional filters. Returns score, decision, and user reference.',
    input_schema: {
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
    },
  },

  {
    name: 'get_fraud_evaluation',
    description: 'Get a specific fraud evaluation by its resource name.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The fraud evaluation's resource name (metadata.name).",
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'list_contacts',
    description: 'List notification contacts across all namespaces.',
    input_schema: {
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
    },
  },

  {
    name: 'list_contact_groups',
    description: 'List contact groups across all namespaces.',
    input_schema: {
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
    },
  },

  {
    name: 'list_emails',
    description:
      'List sent emails across all namespaces. Useful for checking email delivery for a specific user.',
    input_schema: {
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
    },
  },

  {
    name: 'list_email_broadcasts',
    description: 'List email broadcasts across all namespaces.',
    input_schema: {
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
    },
  },

  {
    name: 'query_audit_logs',
    description:
      'Query the platform audit log. Returns recent API activity. Useful for investigating who did what and when.',
    input_schema: {
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
    },
  },

  {
    name: 'get_resource_count',
    description:
      'Get the total count of a specific resource type. Use this to answer "how many X are there?" questions. Efficient — fetches only 1 item to read the total from list metadata.',
    input_schema: {
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
    },
  },
];

/**
 * Returns a human-readable label for a tool name, used in tool_start events
 * so the client can show a contextual "Looking up..." indicator.
 */
export function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    search_resources: 'Searching resources...',
    list_users: 'Listing users...',
    get_user: 'Looking up user...',
    list_organizations: 'Listing organizations...',
    get_organization: 'Looking up organization...',
    list_projects: 'Listing projects...',
    get_project: 'Looking up project...',
    list_fraud_evaluations: 'Listing fraud evaluations...',
    get_fraud_evaluation: 'Looking up fraud evaluation...',
    list_contacts: 'Listing contacts...',
    list_contact_groups: 'Listing contact groups...',
    list_emails: 'Listing emails...',
    list_email_broadcasts: 'Listing email broadcasts...',
    query_audit_logs: 'Querying audit logs...',
    get_resource_count: 'Counting resources...',
  };
  return labels[toolName] ?? `Calling ${toolName}...`;
}
