import { apiRequestClient } from '@/modules/axios/axios.client';
import type { TypedDocumentString } from '@/resources/graphql/gen/graphql';
import { captureApiError } from '@/utils/logger';
import { toast } from '@datum-ui/toast';

// GraphQL proxy URL - routes through our backend which adds auth tokens
const GRAPHQL_PROXY_URL = '/api/graphql';

interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: {
    code?: string;
    response?: {
      status?: number;
      statusText?: string;
      headers?: {
        'audit-id'?: string;
        [key: string]: string | undefined;
      };
      body?: {
        message?: string;
        reason?: string;
        details?: {
          causes?: Array<{
            reason?: string;
            message?: string;
            field?: string;
          }>;
        };
      };
    };
    [key: string]: unknown;
  };
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLError[];
}

/**
 * Extract a user-friendly error message from GraphQL error
 */
function extractErrorMessage(error: GraphQLError): string {
  // Try to get the most specific error message
  const causes = error.extensions?.response?.body?.details?.causes;
  if (causes && causes.length > 0) {
    // Return the first cause message (most specific)
    return causes.map((c) => c.message).join(', ');
  }

  // Try to get the response body message
  const bodyMessage = error.extensions?.response?.body?.message;
  if (bodyMessage) {
    // Extract the meaningful part after "denied the request:"
    const match = bodyMessage.match(/denied the request: (.+)/);
    if (match) {
      return match[1];
    }
    return bodyMessage;
  }

  // Fall back to the top-level error message
  return error.message;
}

/**
 * Execute a GraphQL query with typed document string using axios
 * Benefits: Sentry integration, error toasts, 401 handling all built-in
 *
 * @param document - TypedDocumentString from generated operations (e.g., ListNotesDocument)
 * @param variables - Query variables (type-safe based on the document)
 */
export async function graphqlRequest<TData, TVariables>(
  document: TypedDocumentString<TData, TVariables>,
  variables?: TVariables
): Promise<TData> {
  // TypedDocumentString has a toString() method that returns the query
  const query = document.toString();

  const response = (await apiRequestClient({
    method: 'POST',
    url: GRAPHQL_PROXY_URL,
    baseURL: '', // Override baseURL since we're not using /api/internal
    data: {
      query,
      variables,
    },
  }).execute()) as GraphQLResponse<TData>;

  // Handle GraphQL-level errors (these come with 200 status)
  if (response.errors && response.errors.length > 0) {
    // Extract user-friendly error messages
    const userMessage = response.errors.map(extractErrorMessage).join('; ');
    const technicalMessage = response.errors.map((e) => e.message).join(', ');
    const statusCode = response.errors[0]?.extensions?.response?.status;
    const requestId = response.errors[0]?.extensions?.response?.headers?.['audit-id'];
    const error = new Error(`GraphQL Error: ${technicalMessage}`);

    // Show toast with user-friendly message, status code, and request ID
    const title = requestId
      ? `Request ID: ${requestId}`
      : statusCode
        ? `Error ${statusCode}`
        : 'Error';
    const description = statusCode ? `HTTP Status ${statusCode}: ${userMessage}` : userMessage;
    toast.error(title, { description });

    // Capture to Sentry with full details
    captureApiError(error, {
      url: GRAPHQL_PROXY_URL,
      method: 'POST',
      status: statusCode || 200,
      requestId,
      responseData: response.errors,
    });

    throw error;
  }

  if (!response.data) {
    const error = new Error('GraphQL response missing data');
    toast.error('Error', { description: 'No data received from server' });
    throw error;
  }

  return response.data;
}
